ALTER TABLE public.events_db ADD COLUMN IF NOT EXISTS recurrence_weekday integer, ADD COLUMN IF NOT EXISTS instructor text;
CREATE OR REPLACE FUNCTION public.validate_event_course_series() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.event_type = 'course' THEN
    IF NEW.recurrence_weekday IS NULL OR NEW.recurrence_weekday < 0 OR NEW.recurrence_weekday > 6 THEN
      RAISE EXCEPTION 'יש לבחור יום בשבוע לסדרה';
    END IF;
    IF NEW.end_date IS NULL OR NEW.end_date < NEW.event_date THEN
      RAISE EXCEPTION 'יש לבחור תאריך סיום שאינו מוקדם מתאריך ההתחלה';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_event_course_series BEFORE INSERT OR UPDATE ON public.events_db FOR EACH ROW EXECUTE FUNCTION public.validate_event_course_series();