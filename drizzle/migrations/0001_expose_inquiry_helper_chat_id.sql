CREATE OR REPLACE FUNCTION public.community_inquiry_threads(_inquiry_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  q public.community_inquiries;
  adm boolean := public.has_role(uid, 'admin');
  result jsonb;
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO q
  FROM public.community_inquiries
  WHERE id = _inquiry_id;

  IF q.id IS NULL THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'offer_id', o.id,
    'mine', o.helper_id = uid,
    'helper', CASE
      WHEN o.visible OR q.author_id = uid OR adm
      THEN public.community_inquiry_author_json(o.helper_id, false, uid)
      ELSE NULL
    END,
    'chat_user_id', CASE
      WHEN q.author_id = uid OR adm THEN o.helper_id
      ELSE NULL
    END,
    'connection_type', o.connection_type,
    'contact_mode', o.contact_mode,
    'thanked_at', o.thanked_at,
    'shared_contact', CASE
      WHEN (q.author_id = uid OR adm) AND o.contact_mode = 'share_details'
      THEN jsonb_strip_nulls(jsonb_build_object(
        'whatsapp', CASE WHEN p.contact_show_whatsapp THEN p.contact_whatsapp ELSE NULL END,
        'email', CASE WHEN p.contact_show_email THEN p.contact_email ELSE NULL END
      ))
      ELSE NULL
    END,
    'messages', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', m.id,
        'mine', m.sender_id = uid,
        'body', m.body,
        'created_at', m.created_at
      ) ORDER BY m.created_at)
      FROM public.community_inquiry_messages m
      WHERE m.offer_id = o.id
    ), '[]'::jsonb)
  ) ORDER BY o.created_at), '[]'::jsonb)
  INTO result
  FROM public.community_inquiry_offers o
  LEFT JOIN public.community_profiles p ON p.user_id = o.helper_id
  WHERE o.inquiry_id = q.id
    AND o.status = 'active'
    AND (q.author_id = uid OR o.helper_id = uid OR adm);

  RETURN result;
END
$$;