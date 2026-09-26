CREATE OR REPLACE FUNCTION public.community_toggle_reaction(_target_type text, _target_id uuid, _kind text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); had_same boolean;
BEGIN
  IF NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.community_reactions
    WHERE target_type=_target_type AND target_id=_target_id AND user_id=uid AND kind=_kind
  ) INTO had_same;
  DELETE FROM public.community_reactions
  WHERE target_type=_target_type AND target_id=_target_id AND user_id=uid;
  IF NOT had_same THEN
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

CREATE OR REPLACE FUNCTION public.community_reaction_actors(_target_type text, _target_id uuid, _kind text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); res jsonb;
BEGIN
  IF NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(a ORDER BY ord), '[]'::jsonb) INTO res FROM (
    SELECT public.community_author_json(r.user_id, coalesce(pr.nickname IS NOT NULL AND pr.display_name IS NULL, false), uid)
             || jsonb_build_object('kind', r.kind) AS a,
           r.created_at AS ord
    FROM public.community_reactions r
    LEFT JOIN public.community_profiles pr ON pr.user_id = r.user_id
    WHERE r.target_type = _target_type AND r.target_id = _target_id
      AND (_kind IS NULL OR r.kind = _kind)
    ORDER BY r.created_at
    LIMIT 200
  ) t;
  RETURN res;
END $function$;

GRANT EXECUTE ON FUNCTION public.community_reaction_actors(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_toggle_reaction(text, uuid, text) TO authenticated;