// Daily / weekly digest of new posts in the spaces each woman follows (and in
// the spaces she is a מאסטרית of). Runs on a schedule server-side — it never
// depends on anyone having ליבה open.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'
import { SPACE_NAMES } from '../_shared/spaceNames.ts'

type Period = 'daily' | 'weekly'
type Item = { spaceName: string; title: string; excerpt: string; masterit: boolean }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const url = Deno.env.get('SUPABASE_URL')
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const secret = Deno.env.get('DIGEST_SECRET')
    if (!url || !service) return json({ error: 'Server configuration error' }, 500)

    // Scheduled invocation only: cron passes the shared secret.
    if (secret && req.headers.get('x-digest-secret') !== secret) return json({ error: 'Unauthorized' }, 401)

    const requested = new URL(req.url).searchParams.get('period')
    const period: Period = requested === 'weekly' ? 'weekly' : 'daily'
    const windowMs = period === 'weekly' ? 7 * 24 * 3600_000 : 24 * 3600_000
    const since = new Date(Date.now() - windowMs).toISOString()
    const stamp = new Date().toISOString().slice(0, period === 'weekly' ? 10 : 10)

    const db = createClient(url, service)

    const { data: prefs } = await db
      .from('community_space_prefs')
      .select('user_id,space,email_freq,masterit,masterit_email_freq')
      .or(`email_freq.eq.${period},masterit_email_freq.eq.${period}`)
      .limit(4000)
    if (!prefs?.length) return json({ period, sent: 0 })

    const spaces = [...new Set(prefs.map((p) => p.space))]
    const { data: posts } = await db
      .from('community_posts')
      .select('id,space,title,body,author_id,created_at')
      .in('space', spaces)
      .eq('status', 'active')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(400)
    if (!posts?.length) return json({ period, sent: 0 })

    // group the digest per woman
    const perUser = new Map<string, Item[]>()
    for (const p of prefs) {
      const wantsOwn = p.email_freq === period
      const wantsMasterit = p.masterit && p.masterit_email_freq === period
      if (!wantsOwn && !wantsMasterit) continue
      for (const post of posts) {
        if (post.space !== p.space || post.author_id === p.user_id) continue
        const list = perUser.get(p.user_id) ?? []
        list.push({
          spaceName: SPACE_NAMES[post.space] ?? 'ליבה',
          title: post.title,
          excerpt: String(post.body ?? '').replace(/\s+/g, ' ').slice(0, 180),
          masterit: !!wantsMasterit,
        })
        perUser.set(p.user_id, list)
      }
    }

    const periodLabel = period === 'weekly' ? 'השבוע' : 'היום'
    let sent = 0
    for (const [userId, items] of perUser) {
      if (!items.length) continue
      // has this woman already had this digest?
      const column = period === 'weekly' ? 'weekly_at' : 'daily_at'
      const { data: state } = await db
        .from('community_digest_state')
        .select('daily_at,weekly_at')
        .eq('user_id', userId)
        .maybeSingle()
      const lastSent = period === 'weekly' ? state?.weekly_at : state?.daily_at
      if (lastSent && new Date(lastSent).getTime() > Date.now() - windowMs * 0.9) continue

      const { data: authUser } = await db.auth.admin.getUserById(userId)
      const email = authUser.user?.email
      if (!email) continue

      const result = await sendTemplateEmail('space-digest', email, {
        templateData: { periodLabel, items: items.slice(0, 12) },
        idempotencyKey: `space-digest-${period}-${stamp}-${userId}`,
      })
      if (result.sent) sent++
      await db
        .from('community_digest_state')
        .upsert({ user_id: userId, [column]: new Date().toISOString() }, { onConflict: 'user_id' })
    }

    return json({ period, sent })
  } catch (error) {
    console.error('community-space-digest failed', error)
    return json({ error: 'Internal error' }, 500)
  }
})
