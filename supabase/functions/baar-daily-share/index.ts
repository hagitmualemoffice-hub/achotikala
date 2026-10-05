import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3.23.8'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const BodySchema = z.object({
  boyId: z.string().uuid(),
  toEmail: z.string().trim().email().max(120),
  message: z.string().trim().max(1000).optional().default(''),
})

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
    const url = Deno.env.get('SUPABASE_URL')
    const anon = Deno.env.get('SUPABASE_ANON_KEY')
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !anon || !service) return json({ error: 'Server configuration error' }, 500)

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''))
    const userId = claimsData?.claims?.sub
    if (claimsError || !userId) return json({ error: 'Unauthorized' }, 401)

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400)
    const { boyId, toEmail, message } = parsed.data

    const db = createClient(url, service)

    // only a baar member with access can share the daily card
    const { data: canAccess, error: accessError } = await db.rpc('baar_has_access', { _user_id: userId })
    if (accessError || !canAccess) return json({ error: 'Forbidden' }, 403)

    // the card must be today's daily card, hers
    const israeliDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }))
      .toISOString().slice(0, 10)
    const { data: exposure } = await db
      .from('baar_daily_exposures')
      .select('id')
      .eq('user_id', userId)
      .eq('boy_id', boyId)
      .eq('israeli_date', israeliDate)
      .maybeSingle()
    if (!exposure) return json({ error: 'not_today_card' }, 403)

    // at most N shares of the same boy per sender
    const { count: sentCount } = await db
      .from('baar_daily_sends')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', userId)
      .eq('boy_id', boyId)
    const { data: cfg } = await db.from('baar_daily_config').select('max_sends_per_boy').eq('id', 1).maybeSingle()
    if ((sentCount ?? 0) >= (cfg?.max_sends_per_boy ?? 3)) return json({ error: 'limit_reached' }, 429)

    const cleanEmail = toEmail.trim().toLowerCase()
    if (!EMAIL_RE.test(cleanEmail)) return json({ error: 'bad_email' }, 400)

    // never to herself, and never her own login address
    const { data: me } = await db.auth.admin.getUserById(userId)
    if (me.user?.email && me.user.email.toLowerCase() === cleanEmail) {
      return json({ error: 'self_send' }, 400)
    }

    const inviteCode = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
    const { error: insertError } = await db.from('baar_daily_sends').insert({
      sender_id: userId,
      boy_id: boyId,
      channel: 'email',
      recipient_email: cleanEmail,
      invite_code: inviteCode,
    })
    if (insertError) return json({ error: 'Insert failed' }, 500)

    const cardLink = `https://achotikala.com/liba/baar?boy=${boyId}`
    let sent = false
    try {
      const result = await sendTemplateEmail('daily-baar-share', cleanEmail, {
        templateData: { message: message || '', cardLink },
        idempotencyKey: `daily-baar-share-${exposure.id}-${inviteCode}`,
      })
      sent = result.sent
    } catch (error) {
      console.error('daily-baar-share email failed', error instanceof Error ? error.message : String(error))
      return json({ ok: false, error: 'email_failed' }, 502)
    }

    return json({ ok: true, sent })
  } catch (error) {
    console.error('baar-daily-share failed', error instanceof Error ? error.message : String(error))
    return json({ error: 'Share failed' }, 500)
  }
})
