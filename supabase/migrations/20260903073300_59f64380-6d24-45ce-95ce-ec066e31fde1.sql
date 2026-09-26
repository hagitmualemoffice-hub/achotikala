ALTER TABLE public.apartment_listings DROP CONSTRAINT IF EXISTS apartment_listings_listing_type_check;

UPDATE public.apartment_listings SET listing_type = CASE listing_type
  WHEN 'looking_apartment' THEN 'seeking_apartment'
  WHEN 'looking_roommate' THEN 'roommate_wanted'
  WHEN 'room_available' THEN 'sublet'
  ELSE listing_type END;

ALTER TABLE public.apartment_listings
  ADD CONSTRAINT apartment_listings_listing_type_check
  CHECK (listing_type = ANY (ARRAY['roommate_wanted'::text,'building_new'::text,'sublet'::text,'seeking_apartment'::text]));