-- Revoke public access to profiles table to prevent email exposure
REVOKE SELECT ON public.profiles FROM anon, public;

-- Ensure only authenticated users can access their own profiles
-- The existing RLS policies already handle this, but we need to ensure
-- there's no public grant that bypasses RLS