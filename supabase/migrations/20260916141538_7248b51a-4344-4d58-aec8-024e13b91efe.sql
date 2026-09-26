CREATE TABLE public.community_quiz_entries (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  attempts integer NOT NULL DEFAULT 0,
  answer text,
  solved_at timestamptz,
  note text,
  note_anonymous boolean NOT NULL DEFAULT true,
  note_at timestamptz,
  flamingo_at timestamptz,
  winner_rank integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.community_quiz_entries TO authenticated;
GRANT ALL ON public.community_quiz_entries TO service_role;

ALTER TABLE public.community_quiz_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage their own quiz entry"
ON public.community_quiz_entries FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER community_quiz_entries_updated_at
BEFORE UPDATE ON public.community_quiz_entries
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.community_quiz_host()
RETURNS uuid LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $$ SELECT '33973153-8870-4752-85d0-b1d68499b9c6'::uuid $$;

CREATE OR REPLACE FUNCTION public.community_quiz_state()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid(); e public.community_quiz_entries; notes jsonb;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('authorized', false); END IF;
  SELECT * INTO e FROM public.community_quiz_entries WHERE user_id = uid;

  SELECT coalesce(jsonb_agg(x ORDER BY x->>'at' DESC), '[]'::jsonb) INTO notes FROM (
    SELECT jsonb_build_object(
      'id', q.user_id,
      'name', CASE WHEN q.note_anonymous THEN NULL ELSE p.display_name END,
      'body', q.note,
      'at', q.note_at
    ) AS x
    FROM public.community_quiz_entries q
    LEFT JOIN public.community_profiles p ON p.user_id = q.user_id
    WHERE q.note IS NOT NULL AND length(btrim(q.note)) > 0
    LIMIT 60
  ) s;

  RETURN jsonb_build_object(
    'authorized', true,
    'attempts', coalesce(e.attempts, 0),
    'solved', e.solved_at IS NOT NULL,
    'solved_at', e.solved_at,
    'note', e.note,
    'note_anonymous', coalesce(e.note_anonymous, true),
    'flamingo', e.flamingo_at IS NOT NULL,
    'flamingo_at', e.flamingo_at,
    'winner', e.winner_rank IS NOT NULL,
    'host_id', public.community_quiz_host(),
    'notes', CASE WHEN e.solved_at IS NOT NULL THEN notes ELSE '[]'::jsonb END,
    'can_moderate', public.has_role(uid, 'admin')
  );
END $$;

CREATE OR REPLACE FUNCTION public.community_quiz_answer(_choice text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid(); ok boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  ok := btrim(coalesce(_choice, '')) = 'ג';

  INSERT INTO public.community_quiz_entries (user_id, attempts, answer, solved_at)
  VALUES (uid, 1, _choice, CASE WHEN ok THEN now() ELSE NULL END)
  ON CONFLICT (user_id) DO UPDATE SET
    attempts = public.community_quiz_entries.attempts + 1,
    answer = CASE WHEN ok THEN _choice ELSE public.community_quiz_entries.answer END,
    solved_at = CASE
      WHEN public.community_quiz_entries.solved_at IS NOT NULL THEN public.community_quiz_entries.solved_at
      WHEN ok THEN now() ELSE NULL END;

  RETURN public.community_quiz_state() || jsonb_build_object('correct', ok);
END $$;

CREATE OR REPLACE FUNCTION public.community_quiz_note(_body text, _anonymous boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid(); body text := btrim(coalesce(_body, ''));
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.community_quiz_entries WHERE user_id = uid AND solved_at IS NOT NULL) THEN
    RAISE EXCEPTION 'not_solved' USING ERRCODE='42501';
  END IF;

  UPDATE public.community_quiz_entries SET
    note = nullif(left(body, 1200), ''),
    note_anonymous = coalesce(_anonymous, true),
    note_at = CASE WHEN body = '' THEN NULL ELSE now() END
  WHERE user_id = uid;

  RETURN public.community_quiz_state();
END $$;

CREATE OR REPLACE FUNCTION public.community_quiz_flamingo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE host uuid := public.community_quiz_host(); e public.community_quiz_entries; reply text;
BEGIN
  IF btrim(NEW.body) <> '🦩' OR NEW.sender_id = host THEN RETURN NEW; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.community_thread_participants
    WHERE thread_id = NEW.thread_id AND user_id = host
  ) THEN RETURN NEW; END IF;

  SELECT * INTO e FROM public.community_quiz_entries WHERE user_id = NEW.sender_id;

  IF e.solved_at IS NULL THEN
    reply := 'כמעט 😏' || chr(10) || chr(10) ||
      'הפלמינגו הגיע למקום הנכון,' || chr(10) ||
      'אבל יש עוד משהו קטן שצריך למצוא קודם.' || chr(10) || chr(10) ||
      'חזרי לחידת "מה חדש בליבה?" 👀';
  ELSIF e.flamingo_at IS NOT NULL THEN
    reply := 'את כבר בפנים 🦩💗' || chr(10) || 'מחזיקות לך אצבעות!';
  ELSE
    UPDATE public.community_quiz_entries SET flamingo_at = now() WHERE user_id = NEW.sender_id;
    reply := 'יש! השלמת את המשימה 🦩💗' || chr(10) || chr(10) ||
      'את בפנים.' || chr(10) ||
      'נכנסת להגרלה על 2 כרטיסים לאירוע של אחותי כלה.' || chr(10) || chr(10) ||
      'ובהזדמנות הזאת —' || chr(10) ||
      'עכשיו את כבר יודעת גם איך למצוא מישהי ולכתוב לה בליבה 😉';
  END IF;

  INSERT INTO public.community_messages (thread_id, sender_id, body, ref_title)
  VALUES (NEW.thread_id, host, reply, 'מה חדש בליבה?');

  UPDATE public.community_threads SET last_message_at = now() WHERE id = NEW.thread_id;
  RETURN NEW;
END $$;

CREATE TRIGGER community_quiz_flamingo_after_insert
AFTER INSERT ON public.community_messages
FOR EACH ROW EXECUTE FUNCTION public.community_quiz_flamingo();

CREATE OR REPLACE FUNCTION public.community_quiz_admin_list()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF NOT public.has_role(uid, 'admin') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object(
    'started', (SELECT count(*) FROM public.community_quiz_entries),
    'solved', (SELECT count(*) FROM public.community_quiz_entries WHERE solved_at IS NOT NULL),
    'completed', (SELECT count(*) FROM public.community_quiz_entries WHERE flamingo_at IS NOT NULL),
    'rows', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'user_id', q.user_id,
        'name', coalesce(p.display_name, '—'),
        'attempts', q.attempts,
        'solved_at', q.solved_at,
        'flamingo_at', q.flamingo_at,
        'note', q.note,
        'winner_rank', q.winner_rank
      ) ORDER BY q.updated_at DESC), '[]'::jsonb)
      FROM public.community_quiz_entries q
      LEFT JOIN public.community_profiles p ON p.user_id = q.user_id
    )
  );
END $$;

CREATE OR REPLACE FUNCTION public.community_quiz_draw()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF NOT public.has_role(uid, 'admin') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.community_quiz_entries WHERE winner_rank IS NOT NULL) THEN
    WITH picked AS (
      SELECT user_id, row_number() OVER (ORDER BY random()) AS rn
      FROM public.community_quiz_entries
      WHERE flamingo_at IS NOT NULL
      LIMIT 2
    )
    UPDATE public.community_quiz_entries q SET winner_rank = picked.rn
    FROM picked WHERE picked.user_id = q.user_id;
  END IF;

  RETURN public.community_quiz_admin_list();
END $$;

REVOKE ALL ON FUNCTION public.community_quiz_state() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.community_quiz_answer(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.community_quiz_note(text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.community_quiz_admin_list() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.community_quiz_draw() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.community_quiz_state() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.community_quiz_answer(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.community_quiz_note(text, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.community_quiz_admin_list() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.community_quiz_draw() TO authenticated, service_role;