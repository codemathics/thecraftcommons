-- has_role no longer needs elevated privileges: user_roles RLS already lets a
-- user read their own role rows, so SECURITY INVOKER is sufficient and safe.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Lock down execution surface of the remaining SECURITY DEFINER admin RPCs.
REVOKE ALL ON FUNCTION public.admin_applications() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_cohort() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_insights() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_application_status(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_applications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cohort() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_insights() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_application_status(uuid, text) TO authenticated;

-- touch_updated_at is a trigger-only function: nobody should call it directly.
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;