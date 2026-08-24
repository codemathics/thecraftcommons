-- roles
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE POLICY "Users can read their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- reviews
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL DEFAULT auth.uid(),
  ambition smallint NOT NULL CHECK (ambition BETWEEN 1 AND 5),
  craft_evidence smallint NOT NULL CHECK (craft_evidence BETWEEN 1 AND 5),
  unblock_fit smallint NOT NULL CHECK (unblock_fit BETWEEN 1 AND 5),
  commitment_readiness smallint NOT NULL CHECK (commitment_readiness BETWEEN 1 AND 5),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, reviewer_id)
);

GRANT SELECT, INSERT ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read their own reviews"
ON public.reviews FOR SELECT TO authenticated
USING (reviewer_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can submit their own reviews"
ON public.reviews FOR INSERT TO authenticated
WITH CHECK (reviewer_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));

-- blind review feed: identity is nulled server-side until this reviewer has scored
CREATE OR REPLACE FUNCTION public.admin_applications()
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  name text,
  email text,
  country text,
  experience text,
  makes text[],
  makes_other text,
  work_link text,
  main_tools text[],
  main_tool_other text,
  figma_edu text,
  ai_tools text[],
  ai_tools_other text,
  ai_made text,
  make_3mo text,
  stopping text,
  committed boolean,
  status text,
  reviewed boolean,
  my_ambition smallint,
  my_craft_evidence smallint,
  my_unblock_fit smallint,
  my_commitment_readiness smallint,
  my_notes text,
  my_reviewed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.created_at,
    CASE WHEN r.id IS NULL THEN NULL ELSE a.name END,
    CASE WHEN r.id IS NULL THEN NULL ELSE a.email END,
    a.country,
    a.experience,
    a.makes,
    a.makes_other,
    a.work_link,
    a.main_tools,
    a.main_tool_other,
    a.figma_edu,
    a.ai_tools,
    a.ai_tools_other,
    a.ai_made,
    a.make_3mo,
    a.stopping,
    a.committed,
    a.status,
    (r.id IS NOT NULL),
    r.ambition,
    r.craft_evidence,
    r.unblock_fit,
    r.commitment_readiness,
    r.notes,
    r.created_at
  FROM public.applications a
  LEFT JOIN public.reviews r
    ON r.application_id = a.id AND r.reviewer_id = auth.uid()
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY a.created_at ASC
$$;

GRANT EXECUTE ON FUNCTION public.admin_applications() TO authenticated;