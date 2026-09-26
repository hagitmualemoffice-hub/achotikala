-- ---------- configuration: scoring rules + heart levels ----------
CREATE TABLE IF NOT EXISTS public.community_heart_rules (
  action text PRIMARY KEY,
  hearts integer NOT NULL DEFAULT 0,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.community_heart_rules TO authenticated;
GRANT ALL ON public.community_heart_rules TO service_role;
ALTER TABLE public.community_heart_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "heart rules readable by members"
  ON public.community_heart_rules FOR SELECT TO authenticated
  USING (public.community_is_member(auth.uid()));

CREATE TABLE IF NOT EXISTS public.community_heart_levels (
  key text PRIMARY KEY,
  min_hearts integer NOT NULL,
  label text NOT NULL,
  emoji text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.community_heart_levels TO authenticated;
GRANT ALL ON public.community_heart_levels TO service_role;
ALTER TABLE public.community_heart_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "heart levels readable by members"
  ON public.community_heart_levels FOR SELECT TO authenticated
  USING (public.community_is_member(auth.uid()));

INSERT INTO public.community_heart_rules (action, hearts, label, sort_order) VALUES
  ('profile_complete', 20, 'השלמת "תכירו אותי"', 1),
  ('post',              3, 'פרסום פוסט', 2),
  ('comment',           2, 'תגובה לפוסט של אחרת', 3),
  ('helpful_received',  7, 'קיבלת "עזרת לי"', 4),
  ('react_pray',        1, '"נגעת בי"', 5),
  ('react_me_too',      1, '"גם אני"', 6),
  ('daily_visit',       1, 'כניסה יומית', 7),
  ('react_heart',       0, 'לב ורוד', 8)
ON CONFLICT (action) DO NOTHING;

INSERT INTO public.community_heart_levels (key, min_hearts, label, emoji, sort_order) VALUES
  ('entered', 0,   'נכנסת ללב',   '♡',  1),
  ('present', 20,  'לב נוכח',     '🩷', 2),
  ('open',    75,  'לב פתוח',     '💗', 3),
  ('beating', 200, 'לב פועם',     '💓', 4),
  ('liba',    500, 'הלב של ליבה', '❤️', 5)
ON CONFLICT (key) DO NOTHING;

-- ---------- the ledger ----------
CREATE TABLE IF NOT EXISTS public.community_hearts_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  hearts integer NOT NULL DEFAULT 0,
  idem_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_hearts_ledger_user_idx
  ON public.community_hearts_ledger (user_id, created_at DESC);
GRANT ALL ON public.community_hearts_ledger TO service_role;
ALTER TABLE public.community_hearts_ledger ENABLE ROW LEVEL SECURITY;

-- ---------- profile: hearts + "תכירו אותי" ----------
ALTER TABLE public.community_profiles
  ADD COLUMN IF NOT EXISTS hearts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profile_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS about_area text,
  ADD COLUMN IF NOT EXISTS about_work text,
  ADD COLUMN IF NOT EXISTS about_loves text,
  ADD COLUMN IF NOT EXISTS about_help text,
  ADD COLUMN IF NOT EXISTS mastery_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS mastery_note text,
  ADD COLUMN IF NOT EXISTS contact_via_liba boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS contact_whatsapp text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_show_whatsapp boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_show_email boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS community_profiles_mastery_idx
  ON public.community_profiles USING gin (mastery_tags);

ALTER TABLE public.community_comments
  ADD COLUMN IF NOT EXISTS helpful_at timestamptz;

-- ---------- awarding ----------
CREATE OR REPLACE FUNCTION public.community_award_hearts(
  _uid uuid, _action text, _idem text, _entity_type text DEFAULT NULL, _entity_id uuid DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE val integer; ins integer := 0;
BEGIN
  IF _uid IS NULL THEN RETURN 0; END IF;
  SELECT hearts INTO val FROM public.community_heart_rules WHERE action = _action;
  IF val IS NULL OR val = 0 THEN RETURN 0; END IF;

  INSERT INTO public.community_hearts_ledger (user_id, action, entity_type, entity_id, hearts, idem_key)
  VALUES (_uid, _action, _entity_type, _entity_id, val, _idem)
  ON CONFLICT (idem_key) DO NOTHING;
  GET DIAGNOSTICS ins = ROW_COUNT;
  IF ins = 0 THEN RETURN 0; END IF;

  UPDATE public.community_profiles SET hearts = hearts + val, updated_at = now() WHERE user_id = _uid;
  RETURN val;
END $$;

CREATE OR REPLACE FUNCTION public.community_hearts_json(_uid uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT coalesce(hearts,0) AS h FROM public.community_profiles WHERE user_id = _uid),
  cur AS (
    SELECT l.* FROM public.community_heart_levels l, me
    WHERE l.min_hearts <= me.h ORDER BY l.min_hearts DESC LIMIT 1
  ),
  nxt AS (
    SELECT l.* FROM public.community_heart_levels l, me
    WHERE l.min_hearts > me.h ORDER BY l.min_hearts ASC LIMIT 1
  )
  SELECT jsonb_build_object(
    'hearts', (SELECT h FROM me),
    'level', (SELECT jsonb_build_object('key',key,'label',label,'emoji',emoji,'min',min_hearts) FROM cur),
    'next', (SELECT jsonb_build_object('key',key,'label',label,'emoji',emoji,'min',min_hearts) FROM nxt),
    'rules', (SELECT coalesce(jsonb_agg(jsonb_build_object('action',action,'hearts',hearts,'label',label) ORDER BY sort_order), '[]'::jsonb)
              FROM public.community_heart_rules),
    'levels', (SELECT coalesce(jsonb_agg(jsonb_build_object('key',key,'label',label,'emoji',emoji,'min',min_hearts) ORDER BY sort_order), '[]'::jsonb)
               FROM public.community_heart_levels)
  )
$$;

CREATE OR REPLACE FUNCTION public.community_my_hearts()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  RETURN public.community_hearts_json(uid);
END $$;

-- ---------- profile json: new fields ----------
CREATE OR REPLACE FUNCTION public.community_profile_json(_uid uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'display_name', display_name,
    'initials', public.community_initials(display_name),
    'first_name', first_name,
    'last_name', last_name,
    'nickname', nickname,
    'avatar_url', avatar_url,
    'avatar_in_nickname_mode', avatar_in_nickname_mode,
    'notify_prefs', notify_prefs,
    'show_online', show_online,
    'needs_name', first_name IS NULL,
    'about_area', about_area,
    'about_work', about_work,
    'about_loves', about_loves,
    'about_help', about_help,
    'mastery_tags', to_jsonb(mastery_tags),
    'mastery_note', mastery_note,
    'contact_via_liba', contact_via_liba,
    'contact_whatsapp', contact_whatsapp,
    'contact_email', contact_email,
    'contact_show_whatsapp', contact_show_whatsapp,
    'contact_show_email', contact_show_email,
    'profile_complete', profile_completed_at IS NOT NULL,
    'hearts', public.community_hearts_json(_uid)
  ) FROM public.community_profiles WHERE user_id = _uid
$$;

-- ---------- update profile: adds "תכירו אותי" + completion award ----------
CREATE OR REPLACE FUNCTION public.community_update_profile(
  _first text DEFAULT NULL, _last text DEFAULT NULL, _nick text DEFAULT NULL,
  _avatar text DEFAULT NULL, _clear_avatar boolean DEFAULT false,
  _avatar_in_nickname_mode boolean DEFAULT NULL, _notify_prefs jsonb DEFAULT NULL,
  _show_online boolean DEFAULT NULL, _about jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
        f text := nullif(btrim(coalesce(_first,'')),'');
        l text := nullif(btrim(coalesce(_last,'')),'');
        n text := nullif(btrim(coalesce(_nick,'')),'');
        filled integer; res jsonb;
BEGIN
  IF NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  PERFORM public.community_ensure_profile();
  IF f IS NOT NULL AND length(f) < 2 THEN RAISE EXCEPTION 'first_name_length'; END IF;
  IF f IS NOT NULL AND position('@' in f) > 0 THEN RAISE EXCEPTION 'name_is_email'; END IF;
  IF n IS NOT NULL THEN
    IF length(n) < 2 OR length(n) > 18 THEN RAISE EXCEPTION 'nickname_length'; END IF;
    IF EXISTS (SELECT 1 FROM public.community_profiles WHERE lower(nickname) = lower(n) AND user_id <> uid) THEN
      RAISE EXCEPTION 'nickname_taken';
    END IF;
  END IF;
  IF _avatar IS NOT NULL AND length(_avatar) > 400000 THEN RAISE EXCEPTION 'avatar_too_large'; END IF;

  UPDATE public.community_profiles SET
    first_name = coalesce(f, first_name),
    last_name = CASE WHEN l IS NOT NULL THEN l ELSE last_name END,
    display_name = CASE WHEN f IS NOT NULL THEN btrim(concat_ws(' ', f, coalesce(l, last_name))) ELSE display_name END,
    name_confirmed_at = CASE WHEN f IS NOT NULL THEN now() ELSE name_confirmed_at END,
    nickname = coalesce(n, nickname),
    avatar_url = CASE WHEN _clear_avatar THEN NULL WHEN _avatar IS NOT NULL THEN _avatar ELSE avatar_url END,
    avatar_in_nickname_mode = coalesce(_avatar_in_nickname_mode, avatar_in_nickname_mode),
    notify_prefs = CASE WHEN _notify_prefs IS NULL THEN notify_prefs ELSE notify_prefs || _notify_prefs END,
    show_online = coalesce(_show_online, show_online),
    last_seen_at = CASE WHEN coalesce(_show_online, show_online) THEN now() ELSE last_seen_at END,
    about_area = CASE WHEN _about ? 'area' THEN nullif(btrim(coalesce(_about->>'area','')),'') ELSE about_area END,
    about_work = CASE WHEN _about ? 'work' THEN nullif(btrim(coalesce(_about->>'work','')),'') ELSE about_work END,
    about_loves = CASE WHEN _about ? 'loves' THEN nullif(btrim(coalesce(_about->>'loves','')),'') ELSE about_loves END,
    about_help = CASE WHEN _about ? 'help' THEN nullif(btrim(coalesce(_about->>'help','')),'') ELSE about_help END,
    mastery_tags = CASE WHEN _about ? 'mastery_tags'
      THEN coalesce((SELECT array_agg(DISTINCT btrim(t)) FROM jsonb_array_elements_text(_about->'mastery_tags') AS t WHERE btrim(t) <> ''), '{}')
      ELSE mastery_tags END,
    mastery_note = CASE WHEN _about ? 'mastery_note' THEN nullif(btrim(coalesce(_about->>'mastery_note','')),'') ELSE mastery_note END,
    contact_via_liba = CASE WHEN _about ? 'contact_via_liba' THEN coalesce((_about->>'contact_via_liba')::boolean, true) ELSE contact_via_liba END,
    contact_whatsapp = CASE WHEN _about ? 'contact_whatsapp' THEN nullif(btrim(coalesce(_about->>'contact_whatsapp','')),'') ELSE contact_whatsapp END,
    contact_email = CASE WHEN _about ? 'contact_email' THEN nullif(btrim(coalesce(_about->>'contact_email','')),'') ELSE contact_email END,
    contact_show_whatsapp = CASE WHEN _about ? 'contact_show_whatsapp' THEN coalesce((_about->>'contact_show_whatsapp')::boolean, false) ELSE contact_show_whatsapp END,
    contact_show_email = CASE WHEN _about ? 'contact_show_email' THEN coalesce((_about->>'contact_show_email')::boolean, false) ELSE contact_show_email END,
    updated_at = now()
  WHERE user_id = uid;

  -- "תכירו אותי" counts as complete once she has told us at least three things about herself
  SELECT (CASE WHEN about_area IS NOT NULL THEN 1 ELSE 0 END)
       + (CASE WHEN about_work IS NOT NULL THEN 1 ELSE 0 END)
       + (CASE WHEN about_loves IS NOT NULL THEN 1 ELSE 0 END)
       + (CASE WHEN about_help IS NOT NULL THEN 1 ELSE 0 END)
       + (CASE WHEN coalesce(array_length(mastery_tags,1),0) > 0 THEN 1 ELSE 0 END)
    INTO filled
    FROM public.community_profiles WHERE user_id = uid;

  IF filled >= 3 THEN
    UPDATE public.community_profiles
      SET profile_completed_at = coalesce(profile_completed_at, now())
      WHERE user_id = uid;
    PERFORM public.community_award_hearts(uid, 'profile_complete', 'profile:'||uid::text);
  END IF;

  SELECT public.community_profile_json(uid) INTO res;
  RETURN res;
END $$;

-- ---------- hooks: post, comment, reactions, daily visit ----------
CREATE OR REPLACE FUNCTION public.community_create_post(
  _space text, _body text, _title text DEFAULT NULL, _as_nickname boolean DEFAULT false, _attachments jsonb DEFAULT '[]'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); nid uuid; nick text; a jsonb; clean_title text := btrim(coalesce(_title,''));
BEGIN
  IF NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  IF char_length(clean_title) < 4 OR char_length(clean_title) > 80 THEN RAISE EXCEPTION 'title_required'; END IF;
  PERFORM public.community_ensure_profile();
  IF _as_nickname THEN
    SELECT nickname INTO nick FROM public.community_profiles WHERE user_id = uid;
    IF nick IS NULL THEN RAISE EXCEPTION 'nickname_missing'; END IF;
  END IF;
  INSERT INTO public.community_posts (space, title, body, author_id, as_nickname)
  VALUES (_space, clean_title, btrim(_body), uid, coalesce(_as_nickname,false))
  RETURNING id INTO nid;
  FOR a IN SELECT * FROM jsonb_array_elements(coalesce(_attachments,'[]'::jsonb)) LOOP
    INSERT INTO public.community_attachments (post_id, kind, title, meta, url, storage_path)
    VALUES (nid, coalesce(a->>'kind','link'), coalesce(a->>'title','קובץ'), a->>'meta', a->>'url', a->>'storage_path');
  END LOOP;
  PERFORM public.community_award_hearts(uid, 'post', 'post:'||nid::text, 'post', nid);
  RETURN nid;
END $$;

CREATE OR REPLACE FUNCTION public.community_add_comment(
  _post_id uuid, _body text, _parent_id uuid DEFAULT NULL, _as_nickname boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); nid uuid; nick text; root uuid; owner uuid;
BEGIN
  IF NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  PERFORM public.community_ensure_profile();
  IF _as_nickname THEN
    SELECT nickname INTO nick FROM public.community_profiles WHERE user_id = uid;
    IF nick IS NULL THEN RAISE EXCEPTION 'nickname_missing'; END IF;
  END IF;
  IF _parent_id IS NOT NULL THEN
    SELECT parent_id INTO root FROM public.community_comments WHERE id = _parent_id;
    IF root IS NOT NULL THEN _parent_id := root; END IF;
  END IF;
  INSERT INTO public.community_comments (post_id, parent_id, author_id, as_nickname, body)
  VALUES (_post_id, _parent_id, uid, coalesce(_as_nickname,false), btrim(_body))
  RETURNING id INTO nid;
  UPDATE public.community_posts SET last_activity_at = now() WHERE id = _post_id;
  SELECT author_id INTO owner FROM public.community_posts WHERE id = _post_id;
  IF owner IS DISTINCT FROM uid THEN
    PERFORM public.community_award_hearts(uid, 'comment', 'comment:'||nid::text, 'comment', nid);
  END IF;
  RETURN nid;
END $$;

CREATE OR REPLACE FUNCTION public.community_toggle_reaction(_target_type text, _target_id uuid, _kind text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); existed boolean;
BEGIN
  IF NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  DELETE FROM public.community_reactions
  WHERE target_type=_target_type AND target_id=_target_id AND user_id=uid AND kind=_kind;
  existed := FOUND;
  IF NOT existed THEN
    INSERT INTO public.community_reactions (target_type, target_id, user_id, kind)
    VALUES (_target_type, _target_id, uid, _kind);
    IF _kind IN ('pray','me_too') THEN
      PERFORM public.community_award_hearts(
        uid, 'react_'||_kind,
        'react:'||_kind||':'||_target_type||':'||_target_id::text||':'||uid::text,
        _target_type, _target_id);
    END IF;
  END IF;
  RETURN public.community_reactions_json(_target_type, _target_id, uid);
END $$;

-- ---------- "עזרת לי" ----------
CREATE OR REPLACE FUNCTION public.community_mark_helpful(_comment_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); owner uuid; writer uuid; already timestamptz;
BEGIN
  IF NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  SELECT p.author_id, c.author_id, c.helpful_at INTO owner, writer, already
  FROM public.community_comments c JOIN public.community_posts p ON p.id = c.post_id
  WHERE c.id = _comment_id;
  IF owner IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF owner <> uid THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  IF already IS NOT NULL THEN RETURN jsonb_build_object('helpful', true); END IF;

  UPDATE public.community_comments SET helpful_at = now() WHERE id = _comment_id AND helpful_at IS NULL;
  IF writer IS DISTINCT FROM uid THEN
    PERFORM public.community_award_hearts(writer, 'helpful_received', 'helpful:'||_comment_id::text, 'comment', _comment_id);
  END IF;
  RETURN jsonb_build_object('helpful', true);
END $$;

-- ---------- thread: expose helpful ----------
CREATE OR REPLACE FUNCTION public.community_thread(_post_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); res jsonb;
BEGIN
  IF NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(x ORDER BY created_at), '[]'::jsonb) INTO res FROM (
    SELECT c.created_at, jsonb_build_object(
      'id', c.id, 'body', c.body, 'created_at', c.created_at, 'edited_at', c.edited_at,
      'helpful', c.helpful_at IS NOT NULL,
      'author', public.community_author_json(c.author_id, c.as_nickname, uid),
      'mine', c.author_id = uid,
      'reactions', public.community_reactions_json('comment', c.id, uid),
      'replies', (SELECT coalesce(jsonb_agg(jsonb_build_object(
            'id', r.id, 'body', r.body, 'created_at', r.created_at, 'edited_at', r.edited_at,
            'helpful', r.helpful_at IS NOT NULL,
            'author', public.community_author_json(r.author_id, r.as_nickname, uid),
            'mine', r.author_id = uid,
            'reactions', public.community_reactions_json('comment', r.id, uid)
          ) ORDER BY r.created_at), '[]'::jsonb)
        FROM public.community_comments r WHERE r.parent_id = c.id AND r.status='active')
    ) AS x
    FROM public.community_comments c
    WHERE c.post_id = _post_id AND c.parent_id IS NULL AND c.status='active'
  ) sub;
  RETURN res;
END $$;

-- ---------- daily visit heart, inside bootstrap ----------
CREATE OR REPLACE FUNCTION public.community_bootstrap()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); prev timestamptz; res jsonb; adm boolean; needs_agreement boolean;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('authenticated', false, 'authorized', false); END IF;
  IF NOT public.community_is_member(uid) THEN
    RETURN jsonb_build_object('authenticated', true, 'authorized', false);
  END IF;
  PERFORM public.community_ensure_profile();
  PERFORM public.community_award_hearts(
    uid, 'daily_visit', 'daily:'||uid::text||':'||to_char(now() AT TIME ZONE 'Asia/Jerusalem', 'YYYY-MM-DD'));
  adm := public.has_role(uid, 'admin');
  SELECT last_visit_at INTO prev FROM public.community_profiles WHERE user_id = uid;
  SELECT (p.accepted_agreement_at IS NULL OR p.accepted_advertising_at IS NULL)
    INTO needs_agreement FROM public.community_profiles p WHERE p.user_id = uid;

  res := jsonb_build_object(
    'authenticated', true,
    'authorized', true,
    'is_admin', adm,
    'requires_agreement', coalesce(needs_agreement, true),
    'profile', public.community_profile_json(uid),
    'since', jsonb_build_object(
      'first_visit', prev IS NULL,
      'new_posts', (SELECT count(*) FROM public.community_posts p WHERE p.status='active' AND p.author_id <> uid AND (prev IS NULL OR p.created_at > prev)),
      'replies_to_me', (SELECT count(*) FROM public.community_comments c JOIN public.community_posts p ON p.id=c.post_id
                        WHERE c.status='active' AND p.author_id = uid AND c.author_id <> uid AND (prev IS NULL OR c.created_at > prev)),
      'in_my_threads', (SELECT count(DISTINCT c.post_id) FROM public.community_comments c
                        WHERE c.status='active' AND c.author_id <> uid AND (prev IS NULL OR c.created_at > prev)
                          AND EXISTS (SELECT 1 FROM public.community_comments mine WHERE mine.post_id=c.post_id AND mine.author_id=uid)),
      'new_tools', (SELECT count(*) FROM public.community_tools t WHERE t.status='approved' AND (prev IS NULL OR t.reviewed_at > prev)),
      'hearts_on_my_posts', (SELECT count(*) FROM public.community_reactions r JOIN public.community_posts p ON p.id=r.target_id
                             WHERE r.target_type='post' AND p.author_id=uid AND r.user_id<>uid AND (prev IS NULL OR r.created_at > prev)),
      'me_too_on_my_posts', (SELECT count(*) FROM public.community_reactions r JOIN public.community_posts p ON p.id=r.target_id
                             WHERE r.target_type='post' AND r.kind='me_too' AND p.author_id=uid AND r.user_id<>uid AND (prev IS NULL OR r.created_at > prev))
    ),
    'notices', (SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'note',note) ORDER BY sort_order, created_at DESC), '[]'::jsonb)
                FROM public.community_notices WHERE active),
    'events', (SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'date',date_label,'place',place,'url',url) ORDER BY coalesce(starts_at, created_at)), '[]'::jsonb)
               FROM public.community_events WHERE active AND (starts_at IS NULL OR starts_at > now() - interval '1 day')),
    'tools', (SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'kind',kind,'space',space,'by',credited_name,'url',url,'has_file',storage_path IS NOT NULL,'attachment_id',source_attachment_id) ORDER BY reviewed_at DESC NULLS LAST), '[]'::jsonb)
              FROM public.community_tools WHERE status='approved'),
    'talking_now', (SELECT coalesce(jsonb_agg(x ORDER BY (x->>'recent')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('id', p.id, 'space', p.space, 'title', coalesce(nullif(p.title,''), left(p.body, 60)),
          'recent', (SELECT count(*) FROM public.community_comments c WHERE c.post_id=p.id AND c.status='active' AND c.created_at > now() - interval '2 days')) AS x
        FROM public.community_posts p WHERE p.status='active'
          AND (SELECT count(*) FROM public.community_comments c WHERE c.post_id=p.id AND c.status='active' AND c.created_at > now() - interval '2 days') > 0
        LIMIT 5) t),
    'admin_pending', CASE WHEN adm THEN jsonb_build_object(
        'tools', (SELECT count(*) FROM public.community_tools WHERE status='pending'),
        'reports', (SELECT count(*) FROM public.community_reports WHERE status='pending')) ELSE NULL END
  );

  UPDATE public.community_profiles SET previous_visit_at = last_visit_at, last_visit_at = now() WHERE user_id = uid;
  RETURN res;
END $$;

-- drop the older 7-argument profile update so the client always hits the new one
DROP FUNCTION IF EXISTS public.community_update_profile(text, text, text, text, boolean, boolean, jsonb);
DROP FUNCTION IF EXISTS public.community_update_profile(text, text, text, text, boolean, boolean, jsonb, boolean);