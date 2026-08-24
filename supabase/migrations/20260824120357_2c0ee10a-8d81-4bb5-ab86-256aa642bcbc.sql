CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  email text NOT NULL,
  country text NOT NULL,
  experience text NOT NULL,
  makes text[] NOT NULL DEFAULT '{}',
  makes_other text,
  work_link text,
  main_tools text[] NOT NULL DEFAULT '{}',
  main_tool_other text,
  figma_edu text,
  ai_tools text[] NOT NULL DEFAULT '{}',
  ai_tools_other text,
  ai_made text,
  make_3mo text,
  stopping text,
  committed boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'submitted'
);

GRANT INSERT ON public.applications TO anon;
GRANT INSERT ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an application"
ON public.applications FOR INSERT
TO anon, authenticated
WITH CHECK (true);