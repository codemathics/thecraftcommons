INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'clement@web3d.media'
ON CONFLICT (user_id, role) DO NOTHING;