CREATE OR REPLACE FUNCTION public.community_publish_communication(_draft_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.event_communications; v_post_id uuid; attachments jsonb;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 SELECT * INTO d FROM public.event_communications WHERE id=_draft_id AND communication_kind='system' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'draft_not_found'; END IF;
 IF char_length(btrim(d.title)) NOT BETWEEN 4 AND 80 OR char_length(btrim(d.body)) NOT BETWEEN 1 AND 20000 THEN RAISE EXCEPTION 'invalid_message'; END IF;
 attachments := CASE WHEN d.cover_image='' THEN '[]'::jsonb ELSE jsonb_build_array(jsonb_build_object('kind','image','title',d.title,'url',d.cover_image)) END;
 IF d.system_post_id IS NULL THEN
  v_post_id := public.community_create_post('system',d.body,d.title,false,attachments);
 ELSE
  UPDATE public.community_posts SET title=btrim(d.title),body=btrim(d.body),status='active',edited_at=now() WHERE id=d.system_post_id AND space='system' RETURNING id INTO v_post_id;
  IF v_post_id IS NULL THEN RAISE EXCEPTION 'post_not_found'; END IF;
  DELETE FROM public.community_attachments WHERE post_id=d.system_post_id AND kind='image';
  IF d.cover_image<>'' THEN INSERT INTO public.community_attachments(post_id,kind,title,url) VALUES(v_post_id,'image',d.title,d.cover_image); END IF;
 END IF;
 UPDATE public.community_posts SET show_in_sidebar=true WHERE id=v_post_id;
 UPDATE public.event_communications SET system_post_id=v_post_id,published_at=now() WHERE id=_draft_id;
 RETURN v_post_id;
END $$;
REVOKE ALL ON FUNCTION public.community_publish_communication(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.community_publish_communication(uuid) TO authenticated;