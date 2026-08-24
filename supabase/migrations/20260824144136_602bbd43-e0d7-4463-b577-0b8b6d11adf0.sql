-- cohort accountability records
CREATE TABLE public.cohort_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
  intended_artifact text,
  shipped_artifact_url text,
  shipped_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.cohort_members TO authenticated;
GRANT ALL ON public.cohort_members TO service_role;

ALTER TABLE public.cohort_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read cohort records"
ON public.cohort_members FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create cohort records"
ON public.cohort_members FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update cohort records"
ON public.cohort_members FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER cohort_members_touch
BEFORE UPDATE ON public.cohort_members
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- blind feed, now with review count + status so the UI can gate the decision control
DROP FUNCTION IF EXISTS public.admin_applications();

CREATE FUNCTION public.admin_applications()
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
  my_reviewed_at timestamptz,
  review_count integer,
  admin_count integer,
  fully_reviewed boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH admins AS (
    SELECT count(*)::int AS n FROM public.user_roles WHERE role = 'admin'
  )
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
    r.created_at,
    rc.n,
    admins.n,
    (rc.n >= greatest(admins.n, 2))
  FROM public.applications a
  CROSS JOIN admins
  LEFT JOIN public.reviews r
    ON r.application_id = a.id AND r.reviewer_id = auth.uid()
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS n FROM public.reviews x WHERE x.application_id = a.id
  ) rc ON true
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY a.created_at ASC
$$;

-- decision control: only after every admin (min 2) has scored
CREATE OR REPLACE FUNCTION public.set_application_status(_application_id uuid, _status text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admins int;
  _reviews int;
  _intended text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  IF _status NOT IN ('submitted', 'reviewed', 'selected', 'waitlist', 'declined') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  SELECT count(*)::int INTO _admins FROM public.user_roles WHERE role = 'admin';
  SELECT count(*)::int INTO _reviews FROM public.reviews WHERE application_id = _application_id;

  IF _reviews < greatest(_admins, 2) THEN
    RAISE EXCEPTION 'every reviewer must score this application first';
  END IF;

  UPDATE public.applications SET status = _status WHERE id = _application_id;

  IF _status = 'selected' THEN
    SELECT make_3mo INTO _intended FROM public.applications WHERE id = _application_id;
    INSERT INTO public.cohort_members (application_id, intended_artifact)
    VALUES (_application_id, _intended)
    ON CONFLICT (application_id) DO NOTHING;
  END IF;

  RETURN _status;
END;
$$;

-- cohort view with identity (selection is already decided, so no blinding)
CREATE OR REPLACE FUNCTION public.admin_cohort()
RETURNS TABLE (
  cohort_id uuid,
  application_id uuid,
  name text,
  email text,
  country text,
  experience text,
  makes text[],
  intended_artifact text,
  shipped_artifact_url text,
  shipped_at timestamptz,
  notes text,
  selected_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    a.id,
    a.name,
    a.email,
    a.country,
    a.experience,
    a.makes,
    c.intended_artifact,
    c.shipped_artifact_url,
    c.shipped_at,
    c.notes,
    c.created_at
  FROM public.cohort_members c
  JOIN public.applications a ON a.id = c.application_id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY c.created_at ASC
$$;

-- aggregate insights, no identifying data
CREATE OR REPLACE FUNCTION public.admin_insights()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN NOT public.has_role(auth.uid(), 'admin') THEN NULL::jsonb ELSE
    jsonb_build_object(
      'total', (SELECT count(*) FROM public.applications),
      'committed', (SELECT count(*) FROM public.applications WHERE committed),
      'by_status', (
        SELECT coalesce(jsonb_agg(jsonb_build_object('label', status, 'count', n) ORDER BY n DESC), '[]'::jsonb)
        FROM (SELECT status, count(*)::int n FROM public.applications GROUP BY status) s
      ),
      'makes', (
        SELECT coalesce(jsonb_agg(jsonb_build_object('label', v, 'count', n) ORDER BY n DESC, v), '[]'::jsonb)
        FROM (SELECT unnest(makes) v, count(*)::int n FROM public.applications GROUP BY 1) t
      ),
      'ai_tools', (
        SELECT coalesce(jsonb_agg(jsonb_build_object('label', v, 'count', n) ORDER BY n DESC, v), '[]'::jsonb)
        FROM (SELECT unnest(ai_tools) v, count(*)::int n FROM public.applications GROUP BY 1) t
      ),
      'main_tools', (
        SELECT coalesce(jsonb_agg(jsonb_build_object('label', v, 'count', n) ORDER BY n DESC, v), '[]'::jsonb)
        FROM (SELECT unnest(main_tools) v, count(*)::int n FROM public.applications GROUP BY 1) t
      ),
      'countries', (
        SELECT coalesce(jsonb_agg(jsonb_build_object('label', v, 'count', n) ORDER BY n DESC, v), '[]'::jsonb)
        FROM (SELECT country v, count(*)::int n FROM public.applications GROUP BY 1) t
      ),
      'experience', (
        SELECT coalesce(jsonb_agg(jsonb_build_object('label', v, 'count', n) ORDER BY n DESC, v), '[]'::jsonb)
        FROM (SELECT experience v, count(*)::int n FROM public.applications GROUP BY 1) t
      ),
      'figma', (
        SELECT coalesce(jsonb_agg(jsonb_build_object('label', v, 'count', n) ORDER BY n DESC, v), '[]'::jsonb)
        FROM (
          SELECT CASE
            WHEN NOT ('Figma' = ANY(main_tools)) THEN 'Does not use Figma'
            WHEN figma_edu IS NULL OR figma_edu = '' THEN 'Uses Figma — education status unknown'
            ELSE 'Uses Figma — education: ' || figma_edu
          END v, count(*)::int n
          FROM public.applications GROUP BY 1
        ) t
      )
    )
  END
$$;

REVOKE EXECUTE ON FUNCTION public.admin_applications() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_cohort() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_insights() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_application_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_applications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cohort() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_insights() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_application_status(uuid, text) TO authenticated;