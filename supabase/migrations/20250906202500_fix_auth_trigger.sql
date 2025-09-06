-- Fix the handle_new_user function to include security definer
-- This resolves the 500 Internal Server Error during user signup

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'New User'),
    'owner'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant necessary permissions to the auth admin role
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
