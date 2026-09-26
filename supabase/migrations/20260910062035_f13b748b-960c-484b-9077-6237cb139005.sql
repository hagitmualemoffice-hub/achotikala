ALTER TABLE public.community_reactions DROP CONSTRAINT IF EXISTS community_reactions_kind_chk;
ALTER TABLE public.community_reactions ADD CONSTRAINT community_reactions_kind_chk CHECK (
  kind IN ('heart','pray','clap','useful','me_too','like','sad','happy','excited','hug','wow')
  OR (kind LIKE 'emoji:%' AND char_length(kind) BETWEEN 7 AND 24)
);

CREATE OR REPLACE FUNCTION public.community_reactions_json(_type text, _id uuid, _viewer uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_object_agg(k.kind, jsonb_build_object(
    'count', k.cnt,
    'mine', k.mine
  )), '{}'::jsonb)
  FROM (
    SELECT r.kind,
           count(*) AS cnt,
           bool_or(r.user_id = _viewer) AS mine
    FROM public.community_reactions r
    WHERE r.target_type = _type AND r.target_id = _id
    GROUP BY r.kind
  ) AS k
$$;