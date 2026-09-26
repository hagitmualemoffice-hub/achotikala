-- 1. Baar: any member with baar access may edit a boy's details
ALTER TABLE public.community_baar_boys ADD COLUMN IF NOT EXISTS last_edited_by uuid;

CREATE OR REPLACE FUNCTION public.baar_update(_boy_id uuid, _full_name text, _age integer, _city text, _status text, _orientation text, _ethnicity text, _dress_style text, _details text, _looking_for text, _positives text, _photo_url text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) OR NOT public.baar_has_access(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.community_baar_boys WHERE id = _boy_id AND is_active) THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
  IF char_length(btrim(coalesce(_full_name,''))) < 2 THEN RAISE EXCEPTION 'name_required'; END IF;
  UPDATE public.community_baar_boys
  SET full_name = btrim(_full_name), age = _age, city = _city, status = _status,
      orientation = _orientation, ethnicity = _ethnicity, dress_style = _dress_style,
      details = _details, looking_for = _looking_for, positives = _positives,
      photo_url = _photo_url, last_edited_by = uid, updated_at = now()
  WHERE id = _boy_id;
END;
$function$;

-- 2. Baar deletion requests (stored as reports with kind='deletion'), approved by admin
ALTER TABLE public.community_baar_reports ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'report';

CREATE OR REPLACE FUNCTION public.baar_request_deletion(_boy_id uuid, _reason text, _details text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) OR NOT public.baar_has_access(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF coalesce(btrim(_reason),'') = '' OR char_length(_reason) > 200 THEN RAISE EXCEPTION 'reason_required'; END IF;
  IF _details IS NOT NULL AND char_length(_details) > 2000 THEN RAISE EXCEPTION 'details_too_long'; END IF;
  IF _reason = 'אחר' AND char_length(btrim(coalesce(_details,''))) < 2 THEN RAISE EXCEPTION 'details_required'; END IF;
  INSERT INTO public.community_baar_reports (boy_id, reporter_id, reason, details, kind)
  VALUES (_boy_id, uid, btrim(_reason), nullif(btrim(coalesce(_details,'')),''), 'deletion');
END;
$function$;

CREATE OR REPLACE FUNCTION public.baar_admin_deletion_requests()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'id', r.id, 'boy_id', r.boy_id, 'boy_name', b.full_name, 'boy_active', b.is_active,
      'reason', r.reason, 'details', r.details, 'status', r.status, 'created_at', r.created_at,
      'reporter_name', coalesce(nullif(btrim(concat_ws(' ', p.first_name, p.last_name)),''), p.display_name, 'חברה')
    ) ORDER BY (r.status='pending') DESC, r.created_at DESC)
    FROM public.community_baar_reports r
    JOIN public.community_baar_boys b ON b.id = r.boy_id
    LEFT JOIN public.community_profiles p ON p.user_id = r.reporter_id
    WHERE r.kind = 'deletion'
  ), '[]'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.baar_admin_resolve_deletion(_request_id uuid, _approve boolean)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); bid uuid;
BEGIN
  IF NOT public.has_role(uid,'admin') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  UPDATE public.community_baar_reports
  SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END, reviewed_by = uid, reviewed_at = now()
  WHERE id = _request_id AND kind = 'deletion' RETURNING boy_id INTO bid;
  IF bid IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF _approve THEN
    UPDATE public.community_baar_boys SET is_active = false, archived_at = now(), archived_by = uid, updated_at = now() WHERE id = bid;
    UPDATE public.community_baar_reports SET status = 'approved', reviewed_by = uid, reviewed_at = now()
    WHERE boy_id = bid AND kind = 'deletion' AND status = 'pending';
  END IF;
END;
$function$;

-- 3. Instant access for anyone who requests it (unless an admin previously removed her)
CREATE OR REPLACE FUNCTION public.auto_approve_access_request()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM public.manual_authorized_emails WHERE email = NEW.email AND NOT authorized) THEN
    RETURN NEW; -- previously removed by an admin: stays pending for manual review
  END IF;
  INSERT INTO public.manual_authorized_emails (email, authorized, note)
  VALUES (NEW.email, true, 'אושרה אוטומטית מבקשת גישה · ' || NEW.full_name)
  ON CONFLICT (email) DO UPDATE SET authorized = true, updated_at = now();
  UPDATE public.apartment_access_requests SET status = 'approved', reviewed_at = now() WHERE id = NEW.id;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_auto_approve_access_request ON public.apartment_access_requests;
CREATE TRIGGER trg_auto_approve_access_request AFTER INSERT ON public.apartment_access_requests
FOR EACH ROW EXECUTE FUNCTION public.auto_approve_access_request();

-- 4. System announcements space + optional side-column display
ALTER TABLE public.community_posts DROP CONSTRAINT community_posts_space_chk;
ALTER TABLE public.community_posts ADD CONSTRAINT community_posts_space_chk CHECK (space = ANY (ARRAY['writing','car','finance','discussions','shabbat','spiritual','fertility','system']));
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS show_in_sidebar boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.community_create_post(_space text, _body text, _title text DEFAULT NULL::text, _as_nickname boolean DEFAULT false, _attachments jsonb DEFAULT '[]'::jsonb)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); nid uuid; nick text; a jsonb; clean_title text := btrim(coalesce(_title,''));
BEGIN
  IF NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  IF _space = 'system' AND NOT public.has_role(uid,'admin') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
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
END $function$;

CREATE OR REPLACE FUNCTION public.community_admin_set_sidebar(_post_id uuid, _show boolean)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  UPDATE public.community_posts SET show_in_sidebar = coalesce(_show,false) WHERE id = _post_id AND space = 'system';
END $function$;

CREATE OR REPLACE FUNCTION public.community_sidebar_notices()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.community_is_member(auth.uid()) THEN RETURN '[]'::jsonb; END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title, 'body', left(p.body, 280), 'created_at', p.created_at) ORDER BY p.pinned DESC, p.created_at DESC)
    FROM (SELECT * FROM public.community_posts WHERE space='system' AND show_in_sidebar AND status <> 'removed' ORDER BY pinned DESC, created_at DESC LIMIT 5) p
  ), '[]'::jsonb);
END $function$;

REVOKE ALL ON FUNCTION public.community_sidebar_notices() FROM anon;
REVOKE ALL ON FUNCTION public.community_admin_set_sidebar(uuid, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.baar_admin_deletion_requests() FROM anon;
REVOKE ALL ON FUNCTION public.baar_admin_resolve_deletion(uuid, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.baar_request_deletion(uuid, text, text) FROM anon;