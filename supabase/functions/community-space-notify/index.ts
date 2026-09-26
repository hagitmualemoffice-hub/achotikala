// Sends "פרסום חדש במרחב" emails right after a post is published, to whoever
// asked for every publication in that space — and to the מאסטריות who chose
// email. Anonymous posts never reveal who wrote them.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3.23.8'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'
import { SPACE_NAMES } from '../_shared/spaceNames.ts'

const BodySchema = z.object({ postId: z.string().uuid() })

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
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''))
    const userId = claims?.claims?.sub
    if (claimsError || !userId) return json({ error: 'Unauthorized' }, 401)

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400)

    const db = createClient(url, service)
    const { data: post } = await db
      .from('community_posts')
      .select('id,space,title,body,author_id,as_nickname,status')
      .eq('id', parsed.data.postId)
      .maybeSingle()
    if (!post) return json({ error: 'Not found' }, 404)
    if (post.author_id !== userId) return json({ error: 'Forbidden' }, 403)
    if (post.status !== 'active') return json({ sent: 0 })

    const { data: prefs } = await db
      .from('community_space_prefs')
      .select('user_id,email_freq,masterit,masterit_email_freq')
      .eq('space', post.space)
      .neq('user_id', userId)
      .limit(500)

    const targets = (prefs ?? []).filter(
      (p) => p.email_freq === 'each' || (p.masterit && p.masterit_email_freq === 'each'),
    )

    let authorName = ''
    if (!post.as_nickname) {
      const { data: author } = await db
        .from('community_profiles')
        .select('display_name')
        .eq('user_id', post.author_id)
        .maybeSingle()
      authorName = author?.display_name ?? ''
    }

    const spaceName = SPACE_NAMES[post.space] ?? 'ליבה'
    const excerpt = String(post.body ?? '').replace(/\s+/g, ' ').slice(0, 220)

    let sent = 0
    for (const t of targets) {
      const { data: authUser } = await db.auth.admin.getUserById(t.user_id)
      const email = authUser.user?.email
      if (!email) continue
      const result = await sendTemplateEmail('space-post-new', email, {
        templateData: { spaceName, postTitle: post.title, excerpt, authorName, masterit: !!t.masterit, postId: post.id },
        idempotencyKey: `space-post-${post.id}-${t.user_id}`,
      })
      if (result.sent) sent++
    }

    return json({ sent })
  } catch (error) {
    console.error('community-space-notify failed', error)
    return json({ error: 'Internal error' }, 500)
  }
})
