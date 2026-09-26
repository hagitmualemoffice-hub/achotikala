CREATE TABLE public.community_rotating_quiz_entries (
  campaign_id uuid NOT NULL REFERENCES public.community_rotating_content(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  answer text,
  solved_at timestamptz,
  note text,
  note_anonymous boolean NOT NULL DEFAULT true,
  note_at timestamptz,
  hint_at timestamptz,
  completed_at timestamptz,
  winner_rank integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.community_rotating_quiz_entries TO authenticated;
GRANT ALL ON public.community_rotating_quiz_entries TO service_role;

ALTER TABLE public.community_rotating_quiz_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage their rotating quiz entries"
ON public.community_rotating_quiz_entries FOR ALL TO authenticated
USING (user_id = auth.uid() AND public.community_is_member(auth.uid()))
WITH CHECK (user_id = auth.uid() AND public.community_is_member(auth.uid()));

CREATE INDEX community_rotating_quiz_entries_campaign_idx
ON public.community_rotating_quiz_entries (campaign_id, updated_at DESC);

INSERT INTO public.community_rotating_quiz_entries (
  campaign_id, user_id, attempts, answer, solved_at, note, note_anonymous,
  note_at, hint_at, completed_at, winner_rank, created_at, updated_at
)
SELECT campaign_id, user_id, attempts, answer, solved_at, note, note_anonymous,
  note_at, hint_at, flamingo_at, winner_rank, created_at, updated_at
FROM public.community_quiz_entries
ON CONFLICT (campaign_id, user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.community_rotating_quiz_is_active(_campaign_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_rotating_content
    WHERE id=_campaign_id AND kind='quiz' AND status='published'
      AND starts_at <= now() AND ends_at > now()
  );
$$;

CREATE OR REPLACE FUNCTION public.community_rotating_quiz_state(_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path=public
AS $$
DECLARE uid uuid := auth.uid(); e public.community_rotating_quiz_entries; notes jsonb;
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN RETURN jsonb_build_object('authorized', false); END IF;
  IF NOT public.community_rotating_quiz_is_active(_campaign_id) THEN RETURN jsonb_build_object('authorized', false, 'inactive', true); END IF;
  SELECT * INTO e FROM public.community_rotating_quiz_entries WHERE campaign_id=_campaign_id AND user_id=uid;
  SELECT coalesce(jsonb_agg(x ORDER BY x->>'at' DESC), '[]'::jsonb) INTO notes FROM (
    SELECT jsonb_build_object(
      'id', q.user_id,
      'name', CASE WHEN q.note_anonymous THEN NULL ELSE p.display_name END,
      'body', q.note,
      'at', q.note_at
    ) AS x
    FROM public.community_rotating_quiz_entries q
    LEFT JOIN public.community_profiles p ON p.user_id=q.user_id
    WHERE q.campaign_id=_campaign_id AND q.note IS NOT NULL AND length(btrim(q.note)) > 0
    LIMIT 60
  ) s;
  RETURN jsonb_build_object(
    'authorized', true,
    'attempts', coalesce(e.attempts,0),
    'solved', e.solved_at IS NOT NULL,
    'solved_at', e.solved_at,
    'note', e.note,
    'note_anonymous', coalesce(e.note_anonymous,true),
    'flamingo', e.completed_at IS NOT NULL,
    'flamingo_at', e.completed_at,
    'hint', e.hint_at IS NOT NULL,
    'locked', (e.user_id IS NOT NULL AND e.solved_at IS NULL AND e.attempts > 0 AND e.hint_at IS NULL),
    'winner', e.winner_rank IS NOT NULL,
    'host_id', public.community_quiz_host(),
    'notes', CASE WHEN e.solved_at IS NOT NULL THEN notes ELSE '[]'::jsonb END,
    'can_moderate', public.has_role(uid,'admin')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.community_rotating_quiz_answer(_campaign_id uuid, _choice text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE uid uuid := auth.uid(); correct_choice text; ok boolean; e public.community_rotating_quiz_entries;
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  IF NOT public.community_rotating_quiz_is_active(_campaign_id) THEN RAISE EXCEPTION 'quiz_inactive'; END IF;
  SELECT coalesce(config->>'correct_answer','ג') INTO correct_choice
  FROM public.community_rotating_content WHERE id=_campaign_id;
  ok := btrim(coalesce(_choice,'')) = correct_choice;
  SELECT * INTO e FROM public.community_rotating_quiz_entries WHERE campaign_id=_campaign_id AND user_id=uid;
  IF e.user_id IS NOT NULL AND e.solved_at IS NULL AND e.attempts > 0 AND e.hint_at IS NULL THEN
    RETURN public.community_rotating_quiz_state(_campaign_id) || jsonb_build_object('correct',false);
  END IF;
  INSERT INTO public.community_rotating_quiz_entries (campaign_id,user_id,attempts,answer,solved_at)
  VALUES (_campaign_id,uid,1,_choice,CASE WHEN ok THEN now() ELSE NULL END)
  ON CONFLICT (campaign_id,user_id) DO UPDATE SET
    attempts=public.community_rotating_quiz_entries.attempts+1,
    answer=CASE WHEN ok THEN _choice ELSE public.community_rotating_quiz_entries.answer END,
    solved_at=CASE WHEN public.community_rotating_quiz_entries.solved_at IS NOT NULL THEN public.community_rotating_quiz_entries.solved_at WHEN ok THEN now() ELSE NULL END,
    updated_at=now();
  RETURN public.community_rotating_quiz_state(_campaign_id) || jsonb_build_object('correct',ok);
END;
$$;

CREATE OR REPLACE FUNCTION public.community_rotating_quiz_note(_campaign_id uuid, _body text, _anonymous boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE uid uuid := auth.uid(); clean_body text := btrim(coalesce(_body,''));
BEGIN
  IF NOT public.community_rotating_quiz_is_active(_campaign_id) THEN RAISE EXCEPTION 'quiz_inactive'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.community_rotating_quiz_entries WHERE campaign_id=_campaign_id AND user_id=uid AND solved_at IS NOT NULL) THEN
    RAISE EXCEPTION 'not_solved' USING ERRCODE='42501';
  END IF;
  UPDATE public.community_rotating_quiz_entries SET
    note=nullif(left(clean_body,1200),''), note_anonymous=coalesce(_anonymous,true),
    note_at=CASE WHEN clean_body='' THEN NULL ELSE now() END, updated_at=now()
  WHERE campaign_id=_campaign_id AND user_id=uid;
  RETURN public.community_rotating_quiz_state(_campaign_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.community_rotating_quiz_admin_list(_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path=public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object(
    'started',(SELECT count(*) FROM public.community_rotating_quiz_entries WHERE campaign_id=_campaign_id),
    'solved',(SELECT count(*) FROM public.community_rotating_quiz_entries WHERE campaign_id=_campaign_id AND solved_at IS NOT NULL),
    'completed',(SELECT count(*) FROM public.community_rotating_quiz_entries WHERE campaign_id=_campaign_id AND completed_at IS NOT NULL),
    'rows',(SELECT coalesce(jsonb_agg(jsonb_build_object(
      'user_id',q.user_id,'name',coalesce(p.display_name,'—'),'attempts',q.attempts,
      'solved_at',q.solved_at,'flamingo_at',q.completed_at,'note',q.note,'winner_rank',q.winner_rank
    ) ORDER BY q.updated_at DESC),'[]'::jsonb)
    FROM public.community_rotating_quiz_entries q
    LEFT JOIN public.community_profiles p ON p.user_id=q.user_id
    WHERE q.campaign_id=_campaign_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.community_rotating_quiz_draw(_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE winner_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  SELECT greatest(1,least(20,coalesce((config->>'winner_count')::integer,2))) INTO winner_count
  FROM public.community_rotating_content WHERE id=_campaign_id AND kind='quiz';
  IF NOT EXISTS (SELECT 1 FROM public.community_rotating_quiz_entries WHERE campaign_id=_campaign_id AND winner_rank IS NOT NULL) THEN
    WITH picked AS (
      SELECT user_id,row_number() OVER (ORDER BY random()) AS rn
      FROM public.community_rotating_quiz_entries
      WHERE campaign_id=_campaign_id AND completed_at IS NOT NULL
      LIMIT winner_count
    )
    UPDATE public.community_rotating_quiz_entries q SET winner_rank=picked.rn
    FROM picked WHERE q.campaign_id=_campaign_id AND q.user_id=picked.user_id;
  END IF;
  RETURN public.community_rotating_quiz_admin_list(_campaign_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.community_rotating_quiz_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE host uuid := public.community_quiz_host(); campaign public.community_rotating_content; e public.community_rotating_quiz_entries; reply text; sign text; correct_choice text;
BEGIN
  sign := btrim(NEW.body);
  IF sign NOT IN ('🦩','🐣') OR NEW.sender_id=host THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.community_thread_participants WHERE thread_id=NEW.thread_id AND user_id=host) THEN RETURN NEW; END IF;
  SELECT * INTO campaign FROM public.community_rotating_content
  WHERE kind='quiz' AND status='published' AND starts_at<=now() AND ends_at>now()
  ORDER BY starts_at DESC LIMIT 1;
  IF campaign.id IS NULL THEN RETURN NEW; END IF;
  correct_choice := coalesce(campaign.config->>'correct_answer','ג');
  SELECT * INTO e FROM public.community_rotating_quiz_entries WHERE campaign_id=campaign.id AND user_id=NEW.sender_id;
  IF sign='🐣' THEN
    IF e.solved_at IS NOT NULL THEN
      reply := 'את כבר יודעת את התשובה 😉' || chr(10) || chr(10) || 'עכשיו נשאר רק לשלוח לי כאן 🦩';
    ELSE
      INSERT INTO public.community_rotating_quiz_entries (campaign_id,user_id,hint_at)
      VALUES (campaign.id,NEW.sender_id,now())
      ON CONFLICT (campaign_id,user_id) DO UPDATE SET hint_at=now(),updated_at=now();
      reply := 'מצאת אותי 🐣' || chr(10) || chr(10) || 'והתשובה הנכונה היא...' || chr(10) || chr(10) || correct_choice || '׳ 👀' || chr(10) || chr(10) || 'עכשיו חזרי לחידה וסמני את התשובה.';
    END IF;
  ELSIF e.solved_at IS NULL THEN
    reply := 'כמעט 😏' || chr(10) || chr(10) || 'הפלמינגו הגיע למקום הנכון, אבל קודם צריך לפתור את החידה.';
  ELSIF e.completed_at IS NOT NULL THEN
    reply := 'את כבר בפנים 🦩💗' || chr(10) || 'מחזיקות לך אצבעות!';
  ELSE
    UPDATE public.community_rotating_quiz_entries SET completed_at=now(),updated_at=now()
    WHERE campaign_id=campaign.id AND user_id=NEW.sender_id;
    reply := 'יש! השלמת את המשימה 🦩💗' || chr(10) || chr(10) || 'את בפנים.';
  END IF;
  INSERT INTO public.community_messages (thread_id,sender_id,body,ref_title)
  VALUES (NEW.thread_id,host,reply,campaign.title);
  UPDATE public.community_threads SET last_message_at=now() WHERE id=NEW.thread_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_quiz_message ON public.community_messages;
DROP TRIGGER IF EXISTS community_quiz_flamingo ON public.community_messages;
CREATE TRIGGER community_rotating_quiz_chat
AFTER INSERT ON public.community_messages
FOR EACH ROW EXECUTE FUNCTION public.community_rotating_quiz_chat();

GRANT EXECUTE ON FUNCTION public.community_rotating_quiz_state(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_rotating_quiz_answer(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_rotating_quiz_note(uuid,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_rotating_quiz_admin_list(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_rotating_quiz_draw(uuid) TO authenticated;