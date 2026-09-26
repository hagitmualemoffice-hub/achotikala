ALTER TABLE public.community_reactions DROP CONSTRAINT IF EXISTS community_reactions_kind_chk;
ALTER TABLE public.community_reactions ADD CONSTRAINT community_reactions_kind_chk CHECK (kind IN ('heart','pray','clap','useful','me_too','like','sad','happy','excited','hug','wow'));

CREATE OR REPLACE FUNCTION public.community_reactions_json(_type text, _id uuid, _viewer uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_object_agg(k.kind, jsonb_build_object(
    'count', (SELECT count(*) FROM public.community_reactions r WHERE r.target_type=_type AND r.target_id=_id AND r.kind=k.kind),
    'mine', EXISTS (SELECT 1 FROM public.community_reactions r2 WHERE r2.target_type=_type AND r2.target_id=_id AND r2.kind=k.kind AND r2.user_id=_viewer)
  )), '{}'::jsonb)
  FROM (VALUES ('heart'),('pray'),('clap'),('useful'),('me_too'),('like'),('sad'),('happy'),('excited'),('hug'),('wow')) AS k(kind)
$$;