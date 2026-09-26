CREATE OR REPLACE FUNCTION public.normalize_email(_e text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT lower(regexp_replace(coalesce(_e,''), '[\s\u00A0\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]', '', 'g'))
$$;
CREATE OR REPLACE FUNCTION public.normalize_email_trg() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.email := public.normalize_email(NEW.email); RETURN NEW; END $$;
DELETE FROM public.authorized_emails d WHERE d.email <> public.normalize_email(d.email)
  AND EXISTS (SELECT 1 FROM public.authorized_emails c WHERE c.email = public.normalize_email(d.email));
UPDATE public.authorized_emails SET email = public.normalize_email(email) WHERE email <> public.normalize_email(email);
DELETE FROM public.manual_authorized_emails d WHERE d.email <> public.normalize_email(d.email)
  AND EXISTS (SELECT 1 FROM public.manual_authorized_emails c WHERE c.email = public.normalize_email(d.email));
UPDATE public.manual_authorized_emails SET email = public.normalize_email(email) WHERE email <> public.normalize_email(email);
DROP TRIGGER IF EXISTS normalize_email_ae ON public.authorized_emails;
CREATE TRIGGER normalize_email_ae BEFORE INSERT OR UPDATE ON public.authorized_emails FOR EACH ROW EXECUTE FUNCTION public.normalize_email_trg();
DROP TRIGGER IF EXISTS normalize_email_mae ON public.manual_authorized_emails;
CREATE TRIGGER normalize_email_mae BEFORE INSERT OR UPDATE ON public.manual_authorized_emails FOR EACH ROW EXECUTE FUNCTION public.normalize_email_trg();