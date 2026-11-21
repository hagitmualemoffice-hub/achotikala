ALTER TABLE public.event_communications ALTER COLUMN event_id DROP NOT NULL;
ALTER TABLE public.event_communications ADD COLUMN communication_kind text NOT NULL DEFAULT 'event', ADD COLUMN cover_image text NOT NULL DEFAULT '', ADD COLUMN system_post_id uuid REFERENCES public.community_posts(id) ON DELETE SET NULL, ADD COLUMN published_at timestamptz;
ALTER TABLE public.event_communications ADD CONSTRAINT communication_source_check CHECK ((communication_kind='event' AND event_id IS NOT NULL) OR (communication_kind='system' AND event_id IS NULL)), ADD CONSTRAINT communication_cover_length CHECK (char_length(cover_image)<=8192 AND (cover_image='' OR cover_image ~ '^https://'));
CREATE OR REPLACE FUNCTION public.community_publish_communication(_draft_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.event_communications; post_id uuid; attachments jsonb;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 SELECT * INTO d FROM public.event_communications WHERE id=_draft_id AND communication_kind='system' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'draft_not_found'; END IF;
 IF char_length(btrim(d.title)) NOT BETWEEN 4 AND 80 OR char_length(btrim(d.body)) NOT BETWEEN 1 AND 20000 THEN RAISE EXCEPTION 'invalid_message'; END IF;
 attachments := CASE WHEN d.cover_image='' THEN '[]'::jsonb ELSE jsonb_build_array(jsonb_build_object('kind','image','title',d.title,'url',d.cover_image)) END;
 IF d.system_post_id IS NULL THEN
  post_id := public.community_create_post('system',d.body,d.title,false,attachments);
 ELSE
  UPDATE public.community_posts SET title=btrim(d.title),body=btrim(d.body),status='active',edited_at=now() WHERE id=d.system_post_id AND space='system' RETURNING id INTO post_id;
  IF post_id IS NULL THEN RAISE EXCEPTION 'post_not_found'; END IF;
  DELETE FROM public.community_attachments WHERE post_id=d.system_post_id AND kind='image';
  IF d.cover_image<>'' THEN INSERT INTO public.community_attachments(post_id,kind,title,url) VALUES(post_id,'image',d.title,d.cover_image); END IF;
 END IF;
 UPDATE public.community_posts SET show_in_sidebar=true WHERE id=post_id;
 UPDATE public.event_communications SET system_post_id=post_id,published_at=now() WHERE id=_draft_id;
 RETURN post_id;
END $$;
REVOKE ALL ON FUNCTION public.community_publish_communication(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.community_publish_communication(uuid) TO authenticated;
