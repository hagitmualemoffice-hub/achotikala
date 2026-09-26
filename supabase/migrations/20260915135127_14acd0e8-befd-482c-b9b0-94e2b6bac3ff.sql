CREATE TABLE IF NOT EXISTS public.baar_legacy_emails (
  email text PRIMARY KEY,
  source text NOT NULL DEFAULT 'legacy',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.baar_legacy_emails TO service_role;
ALTER TABLE public.baar_legacy_emails ENABLE ROW LEVEL SECURITY;

INSERT INTO public.baar_legacy_emails (email) VALUES
('24efrat054@gmail.com'), ('26ayelet@gmail.com'), ('adimo679@gmail.com'), ('ankribt@gmail.com'), ('ataragutt@gmail.com'), ('avigail.vi@gmail.com'), ('avitaljnj@gmail.com'), ('aviya5700@gmail.com'), ('ayalamrami@gmail.com'), ('ayalastudies@gmail.com'), ('b0534112406@gmail.com'), ('batchen334@gmail.com'), ('batelch19@gmail.com'), ('batsheva.fisher@gmail.com'), ('battsheva02@gmail.com'), ('batyadcocoa@gmail.com'), ('brachib2@gmail.com'), ('bt899799@gmail.com'), ('btiais12@gmail.com'), ('ch025806702@gmail.com'), ('chanim8705@gmail.com'), ('chavibaras@gmail.com'), ('chaya.sidis@gmail.com'), ('chysg777@gmail.com'), ('chysh777@gmail.com'), ('csp848@gmail.com'), ('dassi776654@gmail.com'), ('dassihass@gmail.com'), ('devorakotzen@gmail.com'), ('dinakat300@gmail.com'), ('dvoralaniado20@gmail.com'), ('e7121059@gmail.com'), ('efinisim@gmail.com'), ('efrat111995@gmail.com'), ('efratka84@gmail.com'), ('esterke212@gmail.com'), ('esti6841@gmail.com'), ('g58211636@gmail.com'), ('gallgolan05@gmail.com'), ('geullalevi@gmail.com'), ('h.rivka.l@gmail.com'), ('hadar543@gmail.com'), ('hadasabenfi100@gmail.com'), ('hadasabengi100@gmail.com'), ('hadasmoshe2@gmail.com'), ('hagit8310@gmail.com'), ('havlinchali@gmail.com'), ('hmezushan@gmail.com'), ('hoda2877@gmail.com'), ('hodaya0324@gmail.com'), ('hodayash@uzvulun.co.il'), ('hs0527192182@gmail.com'), ('hyael5699@gmail.com'), ('kapdebbie@gmail.com'), ('leahadler17@gmail.com'), ('leamiz89@gmail.com'), ('lemarve00@gmail.com'), ('lev404040@gmail.com'), ('limor714@gmail.com'), ('m0548410333@gmail.com'), ('m0548475600@gmail.com'), ('magalproduc@gmail.com'), ('malkiyu@gmail.com'), ('mat.mat.work@gmail.com'), ('michalelbaz92@gmail.com'), ('michalhu91@gmail.com'), ('miri.luchot@gmail.com'), ('miri770r@gmail.com'), ('miritsuissa@gmail.com'), ('mk13726@gmail.com'), ('morti8821@gmail.com'), ('mp1230m@gmail.com'), ('my0548446859@gmail.com'), ('natznatz165@gmail.com'), ('neomiyehuda@gmail.com'), ('nfa897@gmail.com'), ('nomim1995@gmail.com'), ('only0172455@gmail.com'), ('ora05271@gmail.com'), ('orly6655@gmail.com'), ('oslerner@gmail.com'), ('osnat7002@gmail.com'), ('pdut406360@gmail.com'), ('penina3908@gmail.com'), ('picturbag@gmail.com'), ('pinskim.batya@gmail.com'), ('r0534146430@gmail.com'), ('r0548402071@gmail.com'), ('r0548448471@gmail.com'), ('rachelco52123@gmail.com'), ('racheldermer@gmail.com'), ('racheli24808@gmail.com'), ('rachelyf1@gmail.com'), ('rachelyis75@gmail.com'), ('rc3135426@gmail.com'), ('rebbeccajerusalem@gmail.com'), ('rikiart761@gmail.com'), ('rina4109899@gmail.com'), ('rinam321@gmail.com'), ('rivka2769@gmail.com'), ('rivkimiz@walla.co.il'), ('rivkyd1@gmail.com'), ('rkos7887@gmail.com'), ('rosenbaum585@gmail.com'), ('ruchami8884@gmail.com'), ('rutakeshet@gmail.com'), ('ruti2468@gmail.com'), ('sarale3606@gmail.com'), ('sariloona@gmail.com'), ('sc33813@gmail.com'), ('shirach4@gmail.com'), ('shirao5759@gmail.com'), ('shirhashirim123@gmail.com'), ('shosh60996@gmail.com'), ('shuli2613@gmail.com'), ('ta0504139077@gmail.com'), ('taliatovil7@gmail.com'), ('tamar31315@gmail.com'), ('tent84e@gmail.com'), ('tova050412@gmail.com'), ('vinograd900@gmail.com'), ('welcome2miri@gmail.com'), ('yaelicohen2@gmail.com'), ('yaelseg1988@gmail.com'), ('yaelsh1920@gmail.com'), ('yaelyal2024@gmail.com'), ('yirat9717@gmail.com'), ('yiratn5@gmail.com'), ('yitzhakmerav@gmail.com'), ('yoba815@gmail.com'), ('yona815@gmail.com'), ('yud2080@gmail.com')
ON CONFLICT (email) DO NOTHING;

CREATE OR REPLACE FUNCTION public.baar_has_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.community_profiles
    WHERE user_id = _user_id AND baar_access = true
  ) OR EXISTS (
    SELECT 1 FROM auth.users u
    JOIN public.baar_legacy_emails l ON lower(btrim(u.email)) = l.email
    WHERE u.id = _user_id
  )
$fn$;

CREATE OR REPLACE FUNCTION public.baar_sync_legacy_access(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  UPDATE public.community_profiles p
  SET baar_access = true,
      baar_access_granted_at = coalesce(p.baar_access_granted_at, now()),
      baar_access_source = coalesce(p.baar_access_source, 'legacy')
  WHERE p.user_id = _user_id
    AND p.baar_access = false
    AND EXISTS (
      SELECT 1 FROM auth.users u
      JOIN public.baar_legacy_emails l ON lower(btrim(u.email)) = l.email
      WHERE u.id = _user_id
    );
END;
$fn$;

REVOKE ALL ON FUNCTION public.baar_sync_legacy_access(uuid) FROM public;
REVOKE ALL ON FUNCTION public.baar_sync_legacy_access(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.baar_sync_legacy_access(uuid) TO authenticated, service_role;

UPDATE public.community_profiles p
SET baar_access = true,
    baar_access_granted_at = coalesce(p.baar_access_granted_at, now()),
    baar_access_source = coalesce(p.baar_access_source, 'legacy')
WHERE p.baar_access = false
  AND EXISTS (
    SELECT 1 FROM auth.users u
    JOIN public.baar_legacy_emails l ON lower(btrim(u.email)) = l.email
    WHERE u.id = p.user_id
  );