import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3.23.8'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const BodySchema = z.object({ listingId: z.string().uuid() })

const TYPE_LABELS: Record<string, string> = {
  roommate_wanted: 'מחפשות שותפה לדירה קיימת',
  building_new: 'בונה דירה מאפס',
  sublet: 'סאבלט',
  seeking_apartment: 'מחפשת דירה קיימת',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
    const url = Deno.env.get('SUPABASE_URL'); const anon = Deno.env.get('SUPABASE_ANON_KEY'); const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !anon || !service) return json({ error: 'Server configuration error' }, 500)
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''))
    const userId = claimsData?.claims?.sub
    if (claimsError || !userId) return json({ error: 'Unauthorized' }, 401)
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400)
    const db = createClient(url, service)
    const { data: listing } = await db.from('apartment_listings').select('id,author_id,listing_type,city,area,price,entry_date').eq('id', parsed.data.listingId).maybeSingle()
    if (!listing) return json({ error: 'Not found' }, 404)
    if (listing.author_id !== userId) return json({ error: 'Forbidden' }, 403)
    const { data: profiles } = await db.from('community_profiles').select('user_id,notify_prefs').neq('user_id', userId).contains('notify_prefs', { new_apartment: true }).limit(250)
    let sent = 0
    const entryDate = listing.entry_date ? new Date(listing.entry_date).toLocaleDateString('he-IL') : ''
    for (const profile of profiles ?? []) {
      const { data: authUser } = await db.auth.admin.getUserById(profile.user_id)
      const email = authUser.user?.email
      if (!email) continue
      const result = await sendTemplateEmail('apartment-new', email, {
        templateData: {
          typeLabel: TYPE_LABELS[listing.listing_type] ?? 'מודעה חדשה',
          city: listing.city ?? '',
          area: listing.area ?? '',
          price: listing.price ? String(listing.price) : '',
          entryDate,
        },
        idempotencyKey: `apartment-new-${listing.id}-${profile.user_id}`,
      })
      if (result.sent) sent++
    }
    return json({ ok: true, sent })
  } catch (error) {
    console.error('apartment-notify failed', error instanceof Error ? error.message : String(error))
    return json({ error: 'Notification failed' }, 500)
  }
})
