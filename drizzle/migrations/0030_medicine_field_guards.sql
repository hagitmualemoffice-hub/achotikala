CREATE FUNCTION public.medicine_validate_fields() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v text;
BEGIN
 IF TG_TABLE_NAME='medicine_catalog' THEN
  IF char_length(NEW.hebrew_name) NOT BETWEEN 1 AND 80 OR char_length(NEW.brand_name)>100 OR char_length(NEW.generic_name)>150 OR cardinality(NEW.aliases)>40 OR NEW.drug_type NOT IN ('injection','tablets','capsules','gel','patch','nasal spray','supplement','supplies') THEN RAISE EXCEPTION 'invalid'; END IF;
  FOREACH v IN ARRAY NEW.aliases || ARRAY[NEW.hebrew_name,NEW.brand_name,NEW.generic_name] LOOP
   IF char_length(v)>150 OR v ~ '<|>|https?:|www\.' THEN RAISE EXCEPTION 'invalid'; END IF;
  END LOOP;
 ELSIF TG_TABLE_NAME='medicine_listings' THEN
  IF char_length(NEW.drug_name) NOT BETWEEN 1 AND 80 OR char_length(NEW.quantity) NOT BETWEEN 1 AND 80 OR char_length(NEW.dose)>80 OR char_length(NEW.city)>60 OR char_length(NEW.nickname) NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'invalid'; END IF;
  FOREACH v IN ARRAY ARRAY[NEW.drug_name,NEW.quantity,NEW.dose,NEW.city,NEW.nickname] LOOP
   IF v ~ '<|>|@|https?:|www\.|[0-9][0-9 ()+-]{6,}[0-9]' THEN RAISE EXCEPTION 'invalid'; END IF;
  END LOOP;
  IF NEW.city ~ '[0-9]|רחוב|רח׳|רח\.|דירה|קומה|בניין' THEN RAISE EXCEPTION 'invalid'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER medicine_catalog_validate BEFORE INSERT OR UPDATE ON public.medicine_catalog FOR EACH ROW EXECUTE FUNCTION public.medicine_validate_fields();
CREATE TRIGGER medicine_listings_validate BEFORE INSERT OR UPDATE ON public.medicine_listings FOR EACH ROW EXECUTE FUNCTION public.medicine_validate_fields();
REVOKE ALL ON FUNCTION public.medicine_validate_fields() FROM PUBLIC,anon,authenticated;