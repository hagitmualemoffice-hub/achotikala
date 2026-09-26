-- ============ helpers ============
CREATE OR REPLACE FUNCTION public.community_is_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL AND public.has_apartment_access(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.community_initials(_name text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT coalesce(
    (SELECT string_agg(left(w,1), '') FROM (
       SELECT w FROM regexp_split_to_table(btrim(coalesce(_name,'')), '\s+') w LIMIT 2
     ) t),
  '?')
$$;

CREATE OR REPLACE FUNCTION public.community_author_json(_author uuid, _as_nick boolean, _viewer uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE nm text; nick text; label text; adm boolean;
BEGIN
  SELECT display_name, nickname INTO nm, nick FROM public.community_profiles WHERE user_id = _author;
  adm := public.has_role(_viewer, 'admin');
  IF _as_nick THEN label := coalesce(nick, 'חברה בקהילה');
  ELSE label := coalesce(nm, 'חברה בקהילה');
  END IF;
  RETURN jsonb_build_object(
    'name', label,
    'initials', public.community_initials(label),
    'nickname', _as_nick,
    'mine', _author = _viewer,
    'real_name', CASE WHEN adm AND _as_nick THEN nm ELSE NULL END,
    'user_id', CASE WHEN adm THEN _author::text ELSE NULL END
  );
END $$;

CREATE OR REPLACE FUNCTION public.community_reactions_json(_type text, _id uuid, _viewer uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_object_agg(k.kind, jsonb_build_object(
    'count', (SELECT count(*) FROM public.community_reactions r WHERE r.target_type=_type AND r.target_id=_id AND r.kind=k.kind),
    'mine', EXISTS (SELECT 1 FROM public.community_reactions r2 WHERE r2.target_type=_type AND r2.target_id=_id AND r2.kind=k.kind AND r2.user_id=_viewer)
  )), '{}'::jsonb)
  FROM (VALUES ('heart'),('pray'),('clap'),('useful'),('me_too')) AS k(kind)
$$;

CREATE OR REPLACE FUNCTION public.community_attachments_json(_post uuid, _comment uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id, 'kind', a.kind, 'title', a.title, 'meta', a.meta, 'url', a.url,
      'has_file', a.storage_path IS NOT NULL,
      'curated', EXISTS (SELECT 1 FROM public.community_tools t WHERE t.source_attachment_id = a.id AND t.status='approved')
    ) ORDER BY a.created_at), '[]'::jsonb)
  FROM public.community_attachments a
  WHERE (_post IS NOT NULL AND a.post_id = _post) OR (_comment IS NOT NULL AND a.comment_id = _comment)
$$;

-- ============ profile / bootstrap ============
CREATE OR REPLACE FUNCTION public.community_ensure_profile()
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); nm text;
BEGIN
  IF uid IS NULL THEN RETURN; END IF;
  SELECT coalesce(nullif(btrim(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')), ''), split_part(u.email,'@',1))
    INTO nm FROM auth.users u WHERE u.id = uid;
  INSERT INTO public.community_profiles (user_id, display_name)
  VALUES (uid, coalesce(nm, 'חברה בקהילה'))
  ON CONFLICT (user_id) DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.community_set_nickname(_nick text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); n text := btrim(coalesce(_nick,''));
BEGIN
  IF NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  IF length(n) < 2 OR length(n) > 18 THEN RAISE EXCEPTION 'nickname_length'; END IF;
  IF EXISTS (SELECT 1 FROM public.community_profiles WHERE lower(nickname) = lower(n) AND user_id <> uid) THEN
    RAISE EXCEPTION 'nickname_taken';
  END IF;
  PERFORM public.community_ensure_profile();
  UPDATE public.community_profiles SET nickname = n WHERE user_id = uid;
  RETURN jsonb_build_object('nickname', n);
END $$;

CREATE OR REPLACE FUNCTION public.community_bootstrap()
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); prev timestamptz; res jsonb; adm boolean;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('authenticated', false, 'authorized', false); END IF;
  IF NOT public.community_is_member(uid) THEN
    RETURN jsonb_build_object('authenticated', true, 'authorized', false);
  END IF;
  PERFORM public.community_ensure_profile();
  adm := public.has_role(uid, 'admin');
  SELECT last_visit_at INTO prev FROM public.community_profiles WHERE user_id = uid;

  res := jsonb_build_object(
    'authenticated', true,
    'authorized', true,
    'is_admin', adm,
    'profile', (SELECT jsonb_build_object('display_name', display_name, 'initials', public.community_initials(display_name), 'nickname', nickname)
                FROM public.community_profiles WHERE user_id = uid),
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

-- ============ feed & thread ============
CREATE OR REPLACE FUNCTION public.community_feed(_space text DEFAULT NULL, _query text DEFAULT NULL, _sort text DEFAULT 'new', _saved boolean DEFAULT false, _limit int DEFAULT 20, _offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); adm boolean; res jsonb; q text := btrim(coalesce(_query,''));
BEGIN
  IF NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  adm := public.has_role(uid,'admin');
  SELECT coalesce(jsonb_agg(j ORDER BY pinned DESC, ord DESC), '[]'::jsonb) INTO res FROM (
    SELECT p.pinned AS pinned,
      CASE WHEN _sort='active' THEN p.last_activity_at ELSE p.created_at END AS ord,
      jsonb_build_object(
        'id', p.id, 'space', p.space, 'title', p.title, 'body', p.body,
        'created_at', p.created_at, 'edited_at', p.edited_at, 'pinned', p.pinned,
        'author', public.community_author_json(p.author_id, p.as_nickname, uid),
        'mine', p.author_id = uid,
        'can_moderate', adm,
        'unread', (SELECT previous_visit_at FROM public.community_profiles pr WHERE pr.user_id=uid) IS NOT NULL
                  AND p.created_at > (SELECT previous_visit_at FROM public.community_profiles pr WHERE pr.user_id=uid)
                  AND p.author_id <> uid,
        'comment_count', (SELECT count(*) FROM public.community_comments c WHERE c.post_id=p.id AND c.status='active'),
        'saved', EXISTS (SELECT 1 FROM public.community_saved_posts s WHERE s.post_id=p.id AND s.user_id=uid),
        'reactions', public.community_reactions_json('post', p.id, uid),
        'attachments', public.community_attachments_json(p.id, NULL)
      ) AS j
    FROM public.community_posts p
    WHERE p.status='active'
      AND (_space IS NULL OR p.space = _space)
      AND (q = '' OR p.body ILIKE '%'||q||'%' OR coalesce(p.title,'') ILIKE '%'||q||'%'
           OR EXISTS (SELECT 1 FROM public.community_comments c2 WHERE c2.post_id=p.id AND c2.status='active' AND c2.body ILIKE '%'||q||'%'))
      AND (NOT _saved OR EXISTS (SELECT 1 FROM public.community_saved_posts s2 WHERE s2.post_id=p.id AND s2.user_id=uid))
    ORDER BY p.pinned DESC, ord DESC
    LIMIT greatest(1, least(coalesce(_limit,20), 50)) OFFSET greatest(0, coalesce(_offset,0))
  ) sub;
  RETURN res;
END $$;

CREATE OR REPLACE FUNCTION public.community_thread(_post_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); res jsonb;
BEGIN
  IF NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(x ORDER BY created_at), '[]'::jsonb) INTO res FROM (
    SELECT c.created_at, jsonb_build_object(
      'id', c.id, 'body', c.body, 'created_at', c.created_at, 'edited_at', c.edited_at,
      'author', public.community_author_json(c.author_id, c.as_nickname, uid),
      'mine', c.author_id = uid,
      'reactions', public.community_reactions_json('comment', c.id, uid),
      'replies', (SELECT coalesce(jsonb_agg(jsonb_build_object(
            'id', r.id, 'body', r.body, 'created_at', r.created_at, 'edited_at', r.edited_at,
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

-- ============ writes ============
CREATE OR REPLACE FUNCTION public.community_create_post(_space text, _body text, _title text DEFAULT NULL, _as_nickname boolean DEFAULT false, _attachments jsonb DEFAULT '[]'::jsonb)
RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); nid uuid; nick text; a jsonb;
BEGIN
  IF NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  PERFORM public.community_ensure_profile();
  IF _as_nickname THEN
    SELECT nickname INTO nick FROM public.community_profiles WHERE user_id = uid;
    IF nick IS NULL THEN RAISE EXCEPTION 'nickname_missing'; END IF;
  END IF;
  INSERT INTO public.community_posts (space, title, body, author_id, as_nickname)
  VALUES (_space, nullif(btrim(coalesce(_title,'')),''), btrim(_body), uid, coalesce(_as_nickname,false))
  RETURNING id INTO nid;
  FOR a IN SELECT * FROM jsonb_array_elements(coalesce(_attachments,'[]'::jsonb)) LOOP
    INSERT INTO public.community_attachments (post_id, kind, title, meta, url, storage_path)
    VALUES (nid, coalesce(a->>'kind','link'), coalesce(a->>'title','קובץ'), a->>'meta', a->>'url', a->>'storage_path');
  END LOOP;
  RETURN nid;
END $$;

CREATE OR REPLACE FUNCTION public.community_add_comment(_post_id uuid, _body text, _parent_id uuid DEFAULT NULL, _as_nickname boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); nid uuid; nick text; root uuid;
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
  RETURN nid;
END $$;

CREATE OR REPLACE FUNCTION public.community_toggle_reaction(_target_type text, _target_id uuid, _kind text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); existed boolean;
BEGIN
  IF NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  DELETE FROM public.community_reactions
  WHERE target_type=_target_type AND target_id=_target_id AND user_id=uid AND kind=_kind;
  existed := FOUND;
  IF NOT existed THEN
    INSERT INTO public.community_reactions (target_type, target_id, user_id, kind)
    VALUES (_target_type, _target_id, uid, _kind);
  END IF;
  RETURN public.community_reactions_json(_target_type, _target_id, uid);
END $$;

CREATE OR REPLACE FUNCTION public.community_toggle_save(_post_id uuid)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  DELETE FROM public.community_saved_posts WHERE user_id=uid AND post_id=_post_id;
  IF FOUND THEN RETURN false; END IF;
  INSERT INTO public.community_saved_posts (user_id, post_id) VALUES (uid, _post_id);
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.community_update_content(_type text, _id uuid, _body text, _title text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); adm boolean;
BEGIN
  IF NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  adm := public.has_role(uid,'admin');
  IF _type = 'post' THEN
    UPDATE public.community_posts SET body = btrim(_body), title = nullif(btrim(coalesce(_title,'')),''), edited_at = now()
    WHERE id=_id AND (author_id = uid OR adm);
  ELSE
    UPDATE public.community_comments SET body = btrim(_body), edited_at = now()
    WHERE id=_id AND (author_id = uid OR adm);
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_allowed' USING ERRCODE='42501'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.community_delete_content(_type text, _id uuid)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); adm boolean;
BEGIN
  IF NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  adm := public.has_role(uid,'admin');
  IF _type = 'post' THEN
    UPDATE public.community_posts SET status='removed' WHERE id=_id AND (author_id = uid OR adm);
  ELSE
    UPDATE public.community_comments SET status='removed' WHERE id=_id AND (author_id = uid OR adm);
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_allowed' USING ERRCODE='42501'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.community_report(_type text, _id uuid, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  INSERT INTO public.community_reports (target_type, target_id, reporter_id, reason)
  VALUES (_type, _id, uid, left(coalesce(_reason,''), 1000));
END $$;

CREATE OR REPLACE FUNCTION public.community_recommend_tool(_post_id uuid, _attachment_id uuid DEFAULT NULL, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); p record; a record; ttl text; knd text; url text; sp text; who text;
BEGIN
  IF NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  SELECT * INTO p FROM public.community_posts WHERE id=_post_id AND status='active';
  IF p IS NULL THEN RAISE EXCEPTION 'post_missing'; END IF;
  IF _attachment_id IS NULL THEN
    SELECT * INTO a FROM public.community_attachments WHERE post_id=_post_id ORDER BY created_at LIMIT 1;
  ELSE
    SELECT * INTO a FROM public.community_attachments WHERE id=_attachment_id;
  END IF;
  ttl := coalesce(a.title, nullif(p.title,''), left(p.body, 60));
  knd := coalesce(a.kind, 'doc');
  url := a.url;
  sp := p.space;
  who := (public.community_author_json(p.author_id, p.as_nickname, p.author_id))->>'name';
  IF EXISTS (SELECT 1 FROM public.community_tools t WHERE t.source_post_id=_post_id AND t.status IN ('pending','approved')
             AND (t.source_attachment_id = a.id OR (t.source_attachment_id IS NULL AND a.id IS NULL))) THEN
    RETURN;
  END IF;
  INSERT INTO public.community_tools (title, kind, space, url, storage_path, credited_name, note, source_post_id, source_attachment_id, submitted_by)
  VALUES (ttl, knd, sp, url, a.storage_path, who, left(coalesce(_note,''),500), _post_id, a.id, uid);
END $$;

-- ============ admin ============
CREATE OR REPLACE FUNCTION public.community_admin_pin(_post_id uuid, _pinned boolean)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  UPDATE public.community_posts SET pinned = coalesce(_pinned,false) WHERE id = _post_id;
END $$;

CREATE OR REPLACE FUNCTION public.community_admin_queue()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF NOT public.has_role(uid,'admin') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object(
    'tools', (SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'kind',kind,'space',space,'url',url,'by',credited_name,'note',note,'post_id',source_post_id,'created_at',created_at) ORDER BY created_at), '[]'::jsonb)
              FROM public.community_tools WHERE status='pending'),
    'reports', (SELECT coalesce(jsonb_agg(jsonb_build_object(
                  'id', r.id, 'target_type', r.target_type, 'target_id', r.target_id, 'reason', r.reason, 'created_at', r.created_at,
                  'excerpt', CASE WHEN r.target_type='post' THEN (SELECT left(p.body,180) FROM public.community_posts p WHERE p.id=r.target_id)
                                  ELSE (SELECT left(c.body,180) FROM public.community_comments c WHERE c.id=r.target_id) END,
                  'author', CASE WHEN r.target_type='post' THEN (SELECT public.community_author_json(p.author_id,false,uid) FROM public.community_posts p WHERE p.id=r.target_id)
                                 ELSE (SELECT public.community_author_json(c.author_id,false,uid) FROM public.community_comments c WHERE c.id=r.target_id) END
                ) ORDER BY r.created_at), '[]'::jsonb)
                FROM public.community_reports r WHERE r.status='pending')
  );
END $$;

CREATE OR REPLACE FUNCTION public.community_admin_review_tool(_id uuid, _approve boolean, _title text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  UPDATE public.community_tools
  SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
      title = coalesce(nullif(btrim(coalesce(_title,'')),''), title),
      reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _id;
END $$;

CREATE OR REPLACE FUNCTION public.community_admin_review_report(_id uuid, _action text)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  SELECT * INTO r FROM public.community_reports WHERE id=_id;
  IF r IS NULL THEN RETURN; END IF;
  IF _action = 'remove' THEN
    IF r.target_type='post' THEN UPDATE public.community_posts SET status='removed' WHERE id=r.target_id;
    ELSE UPDATE public.community_comments SET status='removed' WHERE id=r.target_id; END IF;
    UPDATE public.community_reports SET status='actioned', reviewed_by=auth.uid(), reviewed_at=now() WHERE id=_id;
  ELSE
    UPDATE public.community_reports SET status='dismissed', reviewed_by=auth.uid(), reviewed_at=now() WHERE id=_id;
  END IF;
END $$;

-- locked-down tables: admin-only direct access, everything else via functions
CREATE POLICY "Admins read community profiles" ON public.community_profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins read community reactions" ON public.community_reactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins read community attachments" ON public.community_attachments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Members read own saved posts" ON public.community_saved_posts FOR SELECT TO authenticated
  USING (user_id = auth.uid());
GRANT SELECT ON public.community_profiles TO authenticated;
GRANT SELECT ON public.community_reactions TO authenticated;
GRANT SELECT ON public.community_attachments TO authenticated;
GRANT SELECT ON public.community_saved_posts TO authenticated;

REVOKE ALL ON FUNCTION public.community_author_json(uuid, boolean, uuid) FROM authenticated, anon;
REVOKE ALL ON FUNCTION public.community_reactions_json(text, uuid, uuid) FROM authenticated, anon;
REVOKE ALL ON FUNCTION public.community_attachments_json(uuid, uuid) FROM authenticated, anon;
REVOKE ALL ON FUNCTION public.community_is_member(uuid) FROM authenticated, anon;
REVOKE ALL ON FUNCTION public.community_ensure_profile() FROM anon;