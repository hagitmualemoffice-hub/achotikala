CREATE TABLE public.community_rotating_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  tab_label text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  cover_image text,
  status text NOT NULL DEFAULT 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  post_id uuid REFERENCES public.community_posts(id) ON DELETE SET NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_rotating_content_kind CHECK (kind IN ('quiz','announcement')),
  CONSTRAINT community_rotating_content_status CHECK (status IN ('draft','published','archived')),
  CONSTRAINT community_rotating_content_tab_label_length CHECK (char_length(btrim(tab_label)) BETWEEN 2 AND 30),
  CONSTRAINT community_rotating_content_title_length CHECK (char_length(btrim(title)) BETWEEN 2 AND 120)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_rotating_content TO authenticated;
GRANT ALL ON public.community_rotating_content TO service_role;

ALTER TABLE public.community_rotating_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Community members read rotating content"
ON public.community_rotating_content FOR SELECT TO authenticated
USING (public.community_is_member(auth.uid()));

CREATE POLICY "Admins manage rotating content"
ON public.community_rotating_content FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX community_rotating_content_active_idx
ON public.community_rotating_content (status, starts_at, ends_at);

CREATE OR REPLACE FUNCTION public.community_rotating_content_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.tab_label := btrim(NEW.tab_label);
  NEW.title := btrim(NEW.title);
  NEW.body := btrim(coalesce(NEW.body, ''));
  NEW.updated_at := now();
  IF NEW.status = 'published' THEN
    IF NEW.starts_at IS NULL OR NEW.ends_at IS NULL THEN
      RAISE EXCEPTION 'schedule_required';
    END IF;
    IF NEW.ends_at <= NEW.starts_at THEN
      RAISE EXCEPTION 'invalid_schedule';
    END IF;
  END IF;
  IF NEW.kind = 'announcement' AND char_length(NEW.body) < 2 THEN
    RAISE EXCEPTION 'body_required';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER community_rotating_content_validate
BEFORE INSERT OR UPDATE ON public.community_rotating_content
FOR EACH ROW EXECUTE FUNCTION public.community_rotating_content_validate();

INSERT INTO public.community_rotating_content (
  id, kind, tab_label, title, body, status, config
) VALUES (
  '8e61b9d8-6d63-4c31-9766-2d4b1b79d331',
  'quiz',
  'עלית על זה?',
  'מה חדש בליבה? 👀',
  'ליבה התחדשה בכמה דברים מאז שהסתכלת לאחרונה. רק אחת מהאפשרויות כאן באמת נכונה. עלית על זה?',
  'archived',
  jsonb_build_object(
    'correct_answer', 'ג',
    'winner_count', 2,
    'options', jsonb_build_array(
      jsonb_build_object('id','א','text','💬 צ''אט אישי – ראית מישהי שכתבה משהו שנגע בך? אפשר פשוט לכתוב לה בפרטי.\n📍 מקומות לדייטים – המלצות מהקהילה למקומות שבאמת נעים להיפגש בהם.\n📝 יומן דייטים – מקום פרטי לזכור עם מי יצאת, מתי ומה בעצם חשבת עליו.\n🚨 שיחת חילוץ – קובעת שעה מראש, ואם הדייט עוד נמשך ליבה מזכירה לחברה שלך להתקבר 😅'),
      jsonb_build_object('id','ב','text','✨ מאסטריות – נשים מהקהילה שבחרו להיות כתובת בתחום שהן ממש מבינות בו.\n💬 צ''אט אישי – אפשר לפנות למישהי מהקהילה ולהמשיך ביניכן בפרטי.\n🔔 חשבנו עלייך – ליבה מזהה שאלה בתחום שאת מכירה ומזמינה אותך לבוא לעזור.\n📍 מקומות לדייטים – מאגר המלצות של הקהילה, כולל שמירה של המקומות שאהבת.'),
      jsonb_build_object('id','ג','text','💧 הבאר – מאגר בחורים עם מידע והמלצות מנשים שבאמת מכירות אותם.\n🔎 אולי את מכירה? – צריכה בירור על בחור? שואלים את הקהילה ומגיעים למי שיודעת.\n💬 צ''אט אישי – אפשר לפנות למישהי מתוך ליבה ולהמשיך את השיחה ביניכן בפרטי.\n✨ מאסטריות – נשים עם ניסיון שבחרו להיות כתובת ולעזור לאחרות בתחום שהן מכירות.'),
      jsonb_build_object('id','ד','text','🤖 השדכנית של ליבה – מספרת מה את מחפשת והמערכת מחפשת לך התאמות מתוך המאגר.\n📊 נו, אז איך היה? – כמה שאלות אחרי הדייט, כדי לעזור לך להחליט אם לתת לזה עוד אחד.\n👯‍♀️ חכמת החברות – מתלבטת על בחור? שולחת לחברות הצבעה אנונימית: כן, לא, או "תני צ''אנס".\n🔕 מצב דייט – משתיק את כל ההתראות מליבה לערב אחד. כי באמת, יש גבול. 😄')
    )
  )
);

ALTER TABLE public.community_quiz_entries
ADD COLUMN campaign_id uuid REFERENCES public.community_rotating_content(id) ON DELETE RESTRICT;

UPDATE public.community_quiz_entries
SET campaign_id = '8e61b9d8-6d63-4c31-9766-2d4b1b79d331'
WHERE campaign_id IS NULL;

ALTER TABLE public.community_quiz_entries
ALTER COLUMN campaign_id SET DEFAULT '8e61b9d8-6d63-4c31-9766-2d4b1b79d331',
ALTER COLUMN campaign_id SET NOT NULL;

ALTER TABLE public.community_quiz_entries DROP CONSTRAINT community_quiz_entries_pkey;
ALTER TABLE public.community_quiz_entries ADD PRIMARY KEY (campaign_id, user_id);

CREATE OR REPLACE FUNCTION public.community_active_rotating_content()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); result jsonb;
BEGIN
  IF NOT public.community_is_member(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501';
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'kind', c.kind,
    'tab_label', c.tab_label,
    'title', c.title,
    'body', c.body,
    'cover_image', c.cover_image,
    'starts_at', c.starts_at,
    'ends_at', c.ends_at,
    'post_id', c.post_id,
    'config', c.config
  ) ORDER BY c.starts_at DESC), '[]'::jsonb)
  INTO result
  FROM public.community_rotating_content c
  WHERE c.status = 'published'
    AND c.starts_at <= now()
    AND c.ends_at > now();
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.community_rotating_admin_list()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); result jsonb;
BEGIN
  IF NOT public.has_role(uid, 'admin') THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE='42501';
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.created_at DESC), '[]'::jsonb)
  INTO result FROM public.community_rotating_content c;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.community_rotating_admin_upsert(
  _id uuid,
  _kind text,
  _tab_label text,
  _title text,
  _body text,
  _cover_image text,
  _status text,
  _starts_at timestamptz,
  _ends_at timestamptz,
  _config jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); item_id uuid := coalesce(_id, gen_random_uuid()); linked_post uuid;
BEGIN
  IF NOT public.has_role(uid, 'admin') THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE='42501';
  END IF;
  IF _kind NOT IN ('quiz','announcement') OR _status NOT IN ('draft','published','archived') THEN
    RAISE EXCEPTION 'invalid_content';
  END IF;

  SELECT post_id INTO linked_post FROM public.community_rotating_content WHERE id = item_id;
  IF _kind = 'announcement' THEN
    IF linked_post IS NULL THEN
      INSERT INTO public.community_posts (space, title, body, author_id, as_nickname, pinned, status)
      VALUES ('discussions', btrim(_title), btrim(_body), uid, false, false, 'featured')
      RETURNING id INTO linked_post;
    ELSE
      UPDATE public.community_posts
      SET title = btrim(_title), body = btrim(_body), edited_at = now(), status = 'featured'
      WHERE id = linked_post;
    END IF;
  END IF;

  INSERT INTO public.community_rotating_content (
    id, kind, tab_label, title, body, cover_image, status, starts_at, ends_at,
    post_id, config, created_by
  ) VALUES (
    item_id, _kind, _tab_label, _title, _body, nullif(btrim(coalesce(_cover_image,'')),''),
    _status, _starts_at, _ends_at, linked_post, coalesce(_config,'{}'::jsonb), uid
  )
  ON CONFLICT (id) DO UPDATE SET
    kind = EXCLUDED.kind,
    tab_label = EXCLUDED.tab_label,
    title = EXCLUDED.title,
    body = EXCLUDED.body,
    cover_image = EXCLUDED.cover_image,
    status = EXCLUDED.status,
    starts_at = EXCLUDED.starts_at,
    ends_at = EXCLUDED.ends_at,
    post_id = EXCLUDED.post_id,
    config = EXCLUDED.config;
  RETURN item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.community_rotating_admin_archive(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE='42501';
  END IF;
  UPDATE public.community_rotating_content SET status='archived' WHERE id=_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.community_rotating_admin_duplicate(_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE source public.community_rotating_content; new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE='42501';
  END IF;
  SELECT * INTO source FROM public.community_rotating_content WHERE id=_id;
  IF source.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  new_id := public.community_rotating_admin_upsert(
    NULL, source.kind, source.tab_label, source.title || ' — עותק', source.body,
    source.cover_image, 'draft', NULL, NULL, source.config
  );
  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.community_active_rotating_content() TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_rotating_admin_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_rotating_admin_upsert(uuid,text,text,text,text,text,text,timestamptz,timestamptz,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_rotating_admin_archive(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_rotating_admin_duplicate(uuid) TO authenticated;