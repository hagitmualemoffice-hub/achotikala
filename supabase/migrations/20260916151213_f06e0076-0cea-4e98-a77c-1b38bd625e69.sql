ALTER TABLE public.community_quiz_entries ADD COLUMN IF NOT EXISTS hint_at timestamptz;

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
    'hint', e.hint_at IS NOT NULL,
    'locked', (e.user_id IS NOT NULL AND e.solved_at IS NULL AND e.attempts > 0 AND e.hint_at IS NULL),
    'winner', e.winner_rank IS NOT NULL,
    'host_id', public.community_quiz_host(),
    'notes', CASE WHEN e.solved_at IS NOT NULL THEN notes ELSE '[]'::jsonb END,
    'can_moderate', public.has_role(uid, 'admin')
  );
END $$;

CREATE OR REPLACE FUNCTION public.community_quiz_answer(_choice text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid(); ok boolean; e public.community_quiz_entries;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  ok := btrim(coalesce(_choice, '')) = 'ג';

  SELECT * INTO e FROM public.community_quiz_entries WHERE user_id = uid;
  -- already answered wrong and has not asked for the hint in the chat yet
  IF e.user_id IS NOT NULL AND e.solved_at IS NULL AND e.attempts > 0 AND e.hint_at IS NULL THEN
    RETURN public.community_quiz_state() || jsonb_build_object('correct', false);
  END IF;

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

CREATE OR REPLACE FUNCTION public.community_quiz_flamingo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE host uuid := public.community_quiz_host(); e public.community_quiz_entries; reply text; sign text;
BEGIN
  sign := btrim(NEW.body);
  IF sign NOT IN ('🦩', '🐣') OR NEW.sender_id = host THEN RETURN NEW; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.community_thread_participants
    WHERE thread_id = NEW.thread_id AND user_id = host
  ) THEN RETURN NEW; END IF;

  SELECT * INTO e FROM public.community_quiz_entries WHERE user_id = NEW.sender_id;

  IF sign = '🐣' THEN
    IF e.solved_at IS NOT NULL THEN
      reply := 'את כבר יודעת את התשובה 😉' || chr(10) || chr(10) ||
        'עכשיו נשאר רק לשלוח לי כאן 🦩';
    ELSE
      UPDATE public.community_quiz_entries SET hint_at = now() WHERE user_id = NEW.sender_id;
      IF NOT FOUND THEN
        INSERT INTO public.community_quiz_entries (user_id, hint_at) VALUES (NEW.sender_id, now())
        ON CONFLICT (user_id) DO UPDATE SET hint_at = now();
      END IF;
      reply := 'מצאת אותי 🐣' || chr(10) || chr(10) ||
        'והתשובה הנכונה היא...' || chr(10) || chr(10) ||
        'ג׳ 👀' || chr(10) || chr(10) ||
        'עכשיו חזרי ל"עלית על זה?",' || chr(10) ||
        'סמני ג׳ ותראי מה מחכה לך שם.';
    END IF;
  ELSIF e.solved_at IS NULL THEN
    reply := 'כמעט 😏' || chr(10) || chr(10) ||
      'הפלמינגו הגיע למקום הנכון,' || chr(10) ||
      'אבל קודם צריך לפתור את החידה.' || chr(10) || chr(10) ||
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