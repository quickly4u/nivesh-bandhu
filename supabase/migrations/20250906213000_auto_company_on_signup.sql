-- Auto-create company and link profile on new auth user
-- Ensures companies row is created whenever profile is created, using signup metadata

-- Update the trigger function with SECURITY DEFINER and company creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id uuid;
  v_name text;
  v_phone text;
  v_cin text;
  v_pan text;
  v_gstin text;
  v_state text;
  v_business_type text;
  v_annual_turnover bigint;
  v_employee_count integer;
  v_incorporation_date date;
  v_registered_address jsonb;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data ->> 'name', 'New User');
  v_phone := NULLIF(NEW.raw_user_meta_data ->> 'phone', '');

  -- Create profile first
  INSERT INTO public.profiles (id, name, phone, role, is_primary)
  VALUES (
    NEW.id,
    v_name,
    v_phone,
    'owner',
    true
  );

  -- Optionally create a company if metadata is present
  IF COALESCE(NEW.raw_user_meta_data ->> 'company_name', '') <> '' THEN
    v_cin := NULLIF(NEW.raw_user_meta_data ->> 'company_cin', '');
    v_pan := NULLIF(NEW.raw_user_meta_data ->> 'company_pan', '');
    v_gstin := NULLIF(NEW.raw_user_meta_data ->> 'company_gstin', '');
    v_state := NULLIF(NEW.raw_user_meta_data ->> 'company_state', '');
    v_business_type := NULLIF(NEW.raw_user_meta_data ->> 'company_business_type', '');
    v_annual_turnover := NULLIF((NEW.raw_user_meta_data ->> 'company_annual_turnover')::bigint, NULL);
    v_employee_count := NULLIF((NEW.raw_user_meta_data ->> 'company_employee_count')::integer, NULL);
    v_incorporation_date := (NEW.raw_user_meta_data ->> 'company_incorporation_date')::date;
    v_registered_address := COALESCE(NEW.raw_user_meta_data -> 'company_address', '{}'::jsonb);

    -- Insert the company, de-duplicating by CIN if present
    INSERT INTO public.companies (
      name, cin, pan, gstin, state, business_type, annual_turnover, employee_count, incorporation_date, registered_address
    ) VALUES (
      NEW.raw_user_meta_data ->> 'company_name',
      v_cin,
      v_pan,
      v_gstin,
      v_state,
      v_business_type,
      COALESCE(v_annual_turnover, 0),
      COALESCE(v_employee_count, 0),
      COALESCE(v_incorporation_date, CURRENT_DATE),
      v_registered_address
    )
    ON CONFLICT (cin) DO UPDATE
      SET name = EXCLUDED.name
    RETURNING id INTO v_company_id;

    -- Link the newly created/updated company to the profile
    UPDATE public.profiles
      SET company_id = v_company_id
      WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Ensure auth can execute the function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
