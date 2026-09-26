import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3.23.8'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const BodySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('created'), inquiryId: z.string().uuid() }),
  z.object({ kind: z.literal('offered'), inquiryId: z.string().uuid() }),
  z.object({ kind: z.literal('thanked'), inquiryId: z.string().uuid() }),
  z.object({ kind: z.literal('thanked_one'), inquiryId: z.string().uuid(), offerId: z.string().uuid() }),
])
const CARD_LINK = 'https://achotikala.com/liba?birurim=1'
const labels: Record<string,string> = { personal:'מכירה אישית', family:'מכירה את המשפחה', heard:'שמעתי / יש לי מידע', can_check:'יכולה לברר', photo:'יש לי תמונה' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (body: unknown, status=200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type':'application/json' } })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({error:'Unauthorized'},401)
    const url = Deno.env.get('SUPABASE_URL'); const anon = Deno.env.get('SUPABASE_ANON_KEY'); const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !anon || !service) return json({error:'Server configuration error'},500)
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(authHeader.replace('Bearer ',''))
    const userId = claimsData?.claims?.sub
    if (claimsError || !userId) return json({error:'Unauthorized'},401)
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) return json({error:parsed.error.flatten().fieldErrors},400)
    const db = createClient(url, service)
    const { data: inquiry } = await db.from('community_inquiries').select('id,author_id,boy_name,background,city').eq('id',parsed.data.inquiryId).maybeSingle()
    if (!inquiry) return json({error:'Not found'},404)
    let sent = 0
    if (parsed.data.kind === 'created') {
      if (inquiry.author_id !== userId) return json({error:'Forbidden'},403)
      const pref = inquiry.background === 'ashkenazi' ? 'inquiry_ashkenazi' : 'inquiry_sephardi'
      const { data: profiles } = await db.from('community_profiles').select('user_id,notify_prefs').neq('user_id',userId)
        .or(`notify_prefs.cs.{"inquiry_all":true},notify_prefs.cs.{"${pref}":true}`).limit(250)
      for (const profile of profiles ?? []) {
        const { data: authUser } = await db.auth.admin.getUserById(profile.user_id)
        const email = authUser.user?.email
        if (!email) continue
        const result = await sendTemplateEmail('inquiry-new', email, { templateData: { boyName: inquiry.boy_name, background: inquiry.background === 'ashkenazi' ? 'אשכנזי' : 'ספרדי', city: inquiry.city ?? '' }, idempotencyKey: `inquiry-new-${inquiry.id}-${profile.user_id}` })
        if (result.sent) sent++
      }
    } else if (parsed.data.kind === 'offered') {
      const { data: offer } = await db.from('community_inquiry_offers').select('id,helper_id,connection_type,contact_mode,visible').eq('inquiry_id',inquiry.id).eq('helper_id',userId).eq('status','active').maybeSingle()
      if (!offer) return json({error:'Forbidden'},403)
      const { data: owner } = await db.auth.admin.getUserById(inquiry.author_id)
      const ownerEmail = owner.user?.email
      if (ownerEmail) {
        const { data: helperProfile } = await db.from('community_profiles').select('display_name,contact_whatsapp,contact_email,contact_show_whatsapp,contact_show_email').eq('user_id',userId).maybeSingle()
        const share = offer.contact_mode === 'share_details'
        const { data: helperAuth } = await db.auth.admin.getUserById(userId)
        const helperEmail = share
          ? (helperProfile?.contact_show_email && helperProfile.contact_email ? helperProfile.contact_email : helperAuth.user?.email ?? '')
          : ''
        const helperWhatsapp = share && helperProfile?.contact_show_whatsapp && helperProfile.contact_whatsapp ? helperProfile.contact_whatsapp : ''
        const result = await sendTemplateEmail('inquiry-help', ownerEmail, {
          templateData: {
            boyName: inquiry.boy_name,
            helperName: offer.visible ? (helperProfile?.display_name ?? 'חברה בליבה') : 'חברה בליבה (בחרה להישאר אנונימית)',
            connection: labels[offer.connection_type] ?? '',
            helperEmail,
            helperWhatsapp,
            cardLink: CARD_LINK,
          },
          idempotencyKey: `inquiry-help-${offer.id}-${offer.connection_type}-${offer.contact_mode}`,
          replyTo: helperEmail || undefined,
        })
        if (result.sent) sent++
      }
    } else if (parsed.data.kind === 'thanked_one') {
      if (inquiry.author_id !== userId) return json({error:'Forbidden'},403)
      const { data: offer } = await db.from('community_inquiry_offers').select('id,helper_id').eq('id',parsed.data.offerId).eq('inquiry_id',inquiry.id).eq('status','active').maybeSingle()
      if (!offer) return json({error:'Not found'},404)
      const { data: helper } = await db.auth.admin.getUserById(offer.helper_id)
      const email = helper.user?.email
      if (email) {
        const result = await sendTemplateEmail('inquiry-thank-you', email, {
          templateData: { boyName: inquiry.boy_name },
          idempotencyKey: `inquiry-thank-you-${inquiry.id}-${offer.helper_id}`,
        })
        if (result.sent) sent++
      }
    } else {
      if (inquiry.author_id !== userId) return json({error:'Forbidden'},403)
      const { data: offers } = await db.from('community_inquiry_offers').select('id,helper_id').eq('inquiry_id',inquiry.id).eq('status','active')
      for (const offer of offers ?? []) {
        const { data: helper } = await db.auth.admin.getUserById(offer.helper_id)
        const email = helper.user?.email
        if (!email) continue
        const result = await sendTemplateEmail('inquiry-thank-you', email, {
          templateData: { boyName: inquiry.boy_name },
          idempotencyKey: `inquiry-thank-you-${inquiry.id}-${offer.helper_id}`,
        })
        if (result.sent) sent++
      }
    }
    return json({ok:true,sent})
  } catch (error) { console.error('community-inquiry-notify failed', error instanceof Error ? error.message : String(error)); return json({error:'Notification failed'},500) }
})
