UPDATE public.community_posts
SET title = CASE
  WHEN length(left(btrim(regexp_replace(body, E'[\\r\\n]+', ' ', 'g')), 80)) >= 4
    THEN left(btrim(regexp_replace(body, E'[\\r\\n]+', ' ', 'g')), 80)
  ELSE 'שיתוף מהלב'
END
WHERE title IS NULL OR btrim(title) = '';

ALTER TABLE public.community_posts
  ALTER COLUMN title SET NOT NULL,
  ADD CONSTRAINT community_posts_title_length CHECK (char_length(btrim(title)) BETWEEN 4 AND 80);

CREATE OR REPLACE FUNCTION public.community_create_post(_space text, _body text, _title text DEFAULT NULL, _as_nickname boolean DEFAULT false, _attachments jsonb DEFAULT '[]'::jsonb)
RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
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
  RETURN nid;
END $$;

CREATE OR REPLACE FUNCTION public.community_update_content(_type text, _id uuid, _body text, _title text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); adm boolean; clean_title text := btrim(coalesce(_title,''));
BEGIN
  IF NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  adm := public.has_role(uid,'admin');
  IF _type = 'post' THEN
    IF char_length(clean_title) < 4 OR char_length(clean_title) > 80 THEN RAISE EXCEPTION 'title_required'; END IF;
    UPDATE public.community_posts SET body = btrim(_body), title = clean_title, edited_at = now()
    WHERE id=_id AND (author_id = uid OR adm);
  ELSE
    UPDATE public.community_comments SET body = btrim(_body), edited_at = now()
    WHERE id=_id AND (author_id = uid OR adm);
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_allowed' USING ERRCODE='42501'; END IF;
END $$;