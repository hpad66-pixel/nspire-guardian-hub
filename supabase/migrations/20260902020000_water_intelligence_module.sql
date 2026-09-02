-- Water Intelligence — standalone executive module (property-scoped, magic-link ready)
-- Toggle per property; seed Glorieta Gardens with multi-account Miami-Dade water/sewer bills.

BEGIN;

-- ─── 1. Property toggle + magic link ─────────────────────────────────────────

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS water_intel_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS water_intel_token text,
  ADD COLUMN IF NOT EXISTS water_intel_token_expires_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS properties_water_intel_token_uidx
  ON public.properties (water_intel_token)
  WHERE water_intel_token IS NOT NULL;

-- ─── 2. Service accounts ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.water_service_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  account_number text NOT NULL,
  meter_number text,
  service_address text NOT NULL,
  building_label text,
  folio_number text,
  provider_name text NOT NULL DEFAULT 'Miami-Dade Water and Sewer (Opa-locka)',
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'closed', 'disputed', 'inactive')),
  notes text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, account_number)
);

CREATE INDEX IF NOT EXISTS water_service_accounts_property_idx
  ON public.water_service_accounts (property_id);

-- ─── 3. Bills ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.water_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.water_service_accounts(id) ON DELETE CASCADE,
  bill_period_start date NOT NULL,
  bill_period_end date NOT NULL,
  billing_date date,
  due_date date,
  previous_balance numeric(12,2) NOT NULL DEFAULT 0,
  current_charges numeric(12,2) NOT NULL DEFAULT 0,
  amount_due numeric(12,2) NOT NULL DEFAULT 0,
  amount_paid numeric(12,2) NOT NULL DEFAULT 0,
  water_charges numeric(12,2) NOT NULL DEFAULT 0,
  sewer_charges numeric(12,2) NOT NULL DEFAULT 0,
  other_fees numeric(12,2) NOT NULL DEFAULT 0,
  consumption_gallons numeric(14,2) NOT NULL DEFAULT 0,
  prior_reading numeric(14,2),
  current_reading numeric(14,2),
  days_of_service int,
  is_estimated boolean NOT NULL DEFAULT false,
  is_duplicate boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'paid', 'past_due', 'disputed', 'credited')),
  document_url text,
  document_name text,
  source text NOT NULL DEFAULT 'seed'
    CHECK (source IN ('seed', 'upload', 'ocr', 'manual', 'api')),
  raw_extract jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS water_bills_property_period_idx
  ON public.water_bills (property_id, bill_period_start DESC);
CREATE INDEX IF NOT EXISTS water_bills_account_period_idx
  ON public.water_bills (account_id, bill_period_start DESC);
CREATE UNIQUE INDEX IF NOT EXISTS water_bills_account_period_uidx
  ON public.water_bills (account_id, bill_period_start);

-- ─── 4. Executive notes ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.water_exec_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.water_service_accounts(id) ON DELETE SET NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text,
  author_email text,
  body text NOT NULL,
  is_shared boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS water_exec_notes_property_idx
  ON public.water_exec_notes (property_id, created_at DESC);

-- ─── 5. Instructions / email log ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.water_exec_instructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.water_service_accounts(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject text NOT NULL,
  body text NOT NULL,
  recipients text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'failed')),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── 6. RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE public.water_service_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_exec_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_exec_instructions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.water_intel_property_ok(p_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = p_property_id
      AND (
        public.is_super_admin()
        OR p.workspace_id = public.current_tenant_id()
        OR public.ops_can_access_property(p.id)
      )
  );
$$;

DROP POLICY IF EXISTS water_service_accounts_all ON public.water_service_accounts;
CREATE POLICY water_service_accounts_all ON public.water_service_accounts
FOR ALL TO authenticated
USING (public.water_intel_property_ok(property_id) OR public.is_super_admin())
WITH CHECK (public.water_intel_property_ok(property_id) OR public.is_super_admin());

DROP POLICY IF EXISTS water_bills_all ON public.water_bills;
CREATE POLICY water_bills_all ON public.water_bills
FOR ALL TO authenticated
USING (public.water_intel_property_ok(property_id) OR public.is_super_admin())
WITH CHECK (public.water_intel_property_ok(property_id) OR public.is_super_admin());

DROP POLICY IF EXISTS water_exec_notes_all ON public.water_exec_notes;
CREATE POLICY water_exec_notes_all ON public.water_exec_notes
FOR ALL TO authenticated
USING (public.water_intel_property_ok(property_id) OR public.is_super_admin())
WITH CHECK (public.water_intel_property_ok(property_id) OR public.is_super_admin());

DROP POLICY IF EXISTS water_exec_instructions_all ON public.water_exec_instructions;
CREATE POLICY water_exec_instructions_all ON public.water_exec_instructions
FOR ALL TO authenticated
USING (public.water_intel_property_ok(property_id) OR public.is_super_admin())
WITH CHECK (public.water_intel_property_ok(property_id) OR public.is_super_admin());

-- Public magic-link read via SECURITY DEFINER RPCs (token gated)
CREATE OR REPLACE FUNCTION public.water_intel_resolve_token(p_token text)
RETURNS TABLE (
  property_id uuid,
  property_name text,
  workspace_id uuid,
  token_expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.workspace_id, p.water_intel_token_expires_at
  FROM public.properties p
  WHERE p.water_intel_enabled = true
    AND p.water_intel_token = p_token
    AND (p.water_intel_token_expires_at IS NULL OR p.water_intel_token_expires_at > now());
$$;

CREATE OR REPLACE FUNCTION public.water_intel_public_accounts(p_token text)
RETURNS SETOF public.water_service_accounts
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.*
  FROM public.water_service_accounts a
  JOIN public.water_intel_resolve_token(p_token) t ON t.property_id = a.property_id
  ORDER BY a.sort_order, a.service_address;
$$;

CREATE OR REPLACE FUNCTION public.water_intel_public_bills(p_token text)
RETURNS SETOF public.water_bills
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.*
  FROM public.water_bills b
  JOIN public.water_intel_resolve_token(p_token) t ON t.property_id = b.property_id
  ORDER BY b.bill_period_start DESC;
$$;

CREATE OR REPLACE FUNCTION public.water_intel_public_notes(p_token text)
RETURNS SETOF public.water_exec_notes
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT n.*
  FROM public.water_exec_notes n
  JOIN public.water_intel_resolve_token(p_token) t ON t.property_id = n.property_id
  WHERE n.is_shared = true
  ORDER BY n.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.water_intel_resolve_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.water_intel_public_accounts(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.water_intel_public_bills(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.water_intel_public_notes(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.water_intel_public_add_note(
  p_token text,
  p_body text,
  p_author_name text DEFAULT NULL,
  p_author_email text DEFAULT NULL,
  p_account_id uuid DEFAULT NULL
)
RETURNS public.water_exec_notes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prop record;
  v_note public.water_exec_notes;
BEGIN
  IF p_body IS NULL OR length(trim(p_body)) < 2 THEN
    RAISE EXCEPTION 'Note body is required';
  END IF;

  SELECT * INTO v_prop FROM public.water_intel_resolve_token(p_token);
  IF v_prop.property_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired Water Intelligence link';
  END IF;

  INSERT INTO public.water_exec_notes (
    tenant_id, property_id, account_id, author_name, author_email, body, is_shared
  ) VALUES (
    v_prop.workspace_id, v_prop.property_id, p_account_id,
    COALESCE(NULLIF(trim(p_author_name), ''), 'Executive guest'),
    NULLIF(trim(p_author_email), ''),
    trim(p_body),
    true
  )
  RETURNING * INTO v_note;

  RETURN v_note;
END;
$$;

CREATE OR REPLACE FUNCTION public.water_intel_public_log_instruction(
  p_token text,
  p_subject text,
  p_body text,
  p_recipients text[],
  p_account_id uuid DEFAULT NULL,
  p_status text DEFAULT 'sent'
)
RETURNS public.water_exec_instructions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prop record;
  v_row public.water_exec_instructions;
BEGIN
  SELECT * INTO v_prop FROM public.water_intel_resolve_token(p_token);
  IF v_prop.property_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired Water Intelligence link';
  END IF;

  INSERT INTO public.water_exec_instructions (
    tenant_id, property_id, account_id, subject, body, recipients, status, sent_at
  ) VALUES (
    v_prop.workspace_id, v_prop.property_id, p_account_id,
    COALESCE(NULLIF(trim(p_subject), ''), 'Water Intelligence instruction'),
    trim(p_body),
    COALESCE(p_recipients, '{}'),
    CASE WHEN p_status IN ('draft', 'sent', 'failed') THEN p_status ELSE 'sent' END,
    CASE WHEN p_status = 'failed' THEN NULL ELSE now() END
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.water_intel_set_enabled(
  p_property_id uuid,
  p_enabled boolean
)
RETURNS TABLE (token text, expires_at timestamptz, enabled boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_expires timestamptz;
BEGIN
  IF NOT (public.is_super_admin() OR public.current_tenant_id() IS NOT NULL) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = p_property_id
      AND (public.is_super_admin() OR p.workspace_id = public.current_tenant_id())
  ) THEN
    RAISE EXCEPTION 'Property not found';
  END IF;

  IF p_enabled THEN
    SELECT encode(gen_random_bytes(24), 'hex') INTO v_token;
    v_expires := now() + interval '365 days';
    UPDATE public.properties
    SET
      water_intel_enabled = true,
      water_intel_token = COALESCE(NULLIF(water_intel_token, ''), v_token),
      water_intel_token_expires_at = COALESCE(water_intel_token_expires_at, v_expires)
    WHERE id = p_property_id;
  ELSE
    UPDATE public.properties
    SET water_intel_enabled = false
    WHERE id = p_property_id;
  END IF;

  RETURN QUERY
  SELECT p.water_intel_token, p.water_intel_token_expires_at, p.water_intel_enabled
  FROM public.properties p
  WHERE p.id = p_property_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.water_intel_rotate_token(p_property_id uuid)
RETURNS TABLE (token text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text := encode(gen_random_bytes(24), 'hex');
  v_expires timestamptz := now() + interval '365 days';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = p_property_id
      AND (public.is_super_admin() OR p.workspace_id = public.current_tenant_id())
  ) THEN
    RAISE EXCEPTION 'Property not found';
  END IF;

  UPDATE public.properties
  SET
    water_intel_enabled = true,
    water_intel_token = v_token,
    water_intel_token_expires_at = v_expires
  WHERE id = p_property_id;

  RETURN QUERY SELECT v_token, v_expires;
END;
$$;

GRANT EXECUTE ON FUNCTION public.water_intel_public_add_note(text, text, text, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.water_intel_public_log_instruction(text, text, text, text[], uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.water_intel_set_enabled(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.water_intel_rotate_token(uuid) TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'water-bills',
  'water-bills',
  false,
  20971520,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Members read water bills" ON storage.objects;
CREATE POLICY "Members read water bills"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'water-bills');

DROP POLICY IF EXISTS "Members upload water bills" ON storage.objects;
CREATE POLICY "Members upload water bills"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'water-bills');

DROP POLICY IF EXISTS "Members update water bills" ON storage.objects;
CREATE POLICY "Members update water bills"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'water-bills');

-- ─── 7. Enable Glorieta + seed accounts / bills ──────────────────────────────

DO $$
DECLARE
  v_prop uuid;
  v_ws uuid;
  v_token text := encode(gen_random_bytes(24), 'hex');
BEGIN
  SELECT p.id, p.workspace_id INTO v_prop, v_ws
  FROM public.properties p
  WHERE lower(p.name) LIKE '%glorieta%'
  ORDER BY CASE WHEN lower(p.name) LIKE '%apartment%' THEN 0 ELSE 1 END, p.created_at
  LIMIT 1;

  IF v_prop IS NULL THEN
    RAISE NOTICE 'Glorieta property not found — skipping water intel seed';
    RETURN;
  END IF;

  IF v_ws IS NULL THEN
    SELECT workspace_id INTO v_ws FROM public.properties WHERE id = v_prop;
  END IF;

  UPDATE public.properties
  SET
    water_intel_enabled = true,
    water_intel_token = COALESCE(NULLIF(water_intel_token, ''), v_token),
    water_intel_token_expires_at = now() + interval '365 days',
    ops_portal_modules = CASE
      WHEN ops_portal_modules IS NULL THEN ops_portal_modules
      WHEN NOT (ops_portal_modules ? 'water') THEN ops_portal_modules || '["water"]'::jsonb
      ELSE ops_portal_modules
    END
  WHERE id = v_prop;
END $$;

-- Seed accounts (idempotent by account_number)
WITH prop AS (
  SELECT p.id AS property_id, p.workspace_id AS tenant_id
  FROM public.properties p
  WHERE lower(p.name) LIKE '%glorieta%'
  ORDER BY CASE WHEN lower(p.name) LIKE '%apartment%' THEN 0 ELSE 1 END
  LIMIT 1
),
accounts(account_number, meter_number, service_address, building_label, folio_number, sort_order, status, notes) AS (
  VALUES
    ('2745714336', '61302354', '13200 Alexandria Dr', 'Building 8', '08-2128-007-0210', 10, 'disputed',
     'Formal dispute filed 2026-07-23 — estimated usage ~216k gal/mo for vacant period'),
    ('1674911185', '16020263', '13235 Alexandria Dr', 'Building 3', NULL, 20, 'active', NULL),
    ('8082997418', '16020268', '13210 Alexandria Dr', 'Building 5/6', NULL, 30, 'active', NULL),
    ('4621903166', '17096378', '13180 Port Said Rd', 'Port Said East', NULL, 40, 'active', 'First bill / deposits Aug 2024'),
    ('9952938168', NULL, '13440 Aswan Rd', 'Aswan North', NULL, 50, 'active', NULL),
    ('13120-NW32', NULL, '13120 NW 32nd Ct', 'NW 32nd Court', NULL, 60, 'active', NULL),
    ('13120-PORT', NULL, '13120 Port Said Rd', 'Port Said West', NULL, 70, 'active', NULL),
    ('13250-ALEX', NULL, '13250 Alexandria Dr', 'Building 7 / North', NULL, 80, 'active', NULL),
    ('13410-ASWAN', NULL, '13410 Aswan Rd', 'Aswan South', NULL, 90, 'active', NULL),
    ('13010-ALEX', NULL, '13010 Alexandria Dr', 'Alexandria South', NULL, 100, 'active', NULL)
)
INSERT INTO public.water_service_accounts (
  tenant_id, property_id, account_number, meter_number, service_address,
  building_label, folio_number, status, notes, sort_order
)
SELECT prop.tenant_id, prop.property_id, a.account_number, a.meter_number, a.service_address,
       a.building_label, a.folio_number, a.status, a.notes, a.sort_order
FROM prop
CROSS JOIN accounts a
ON CONFLICT (property_id, account_number) DO UPDATE
SET meter_number = EXCLUDED.meter_number,
    service_address = EXCLUDED.service_address,
    building_label = EXCLUDED.building_label,
    folio_number = EXCLUDED.folio_number,
    status = EXCLUDED.status,
    notes = COALESCE(EXCLUDED.notes, public.water_service_accounts.notes),
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

-- Generate monthly bills Dec 2022 → Jun 2026 for each account
WITH prop AS (
  SELECT p.id AS property_id, p.workspace_id AS tenant_id
  FROM public.properties p
  WHERE lower(p.name) LIKE '%glorieta%'
  ORDER BY CASE WHEN lower(p.name) LIKE '%apartment%' THEN 0 ELSE 1 END
  LIMIT 1
),
months AS (
  SELECT generate_series('2022-12-01'::date, '2026-06-01'::date, '1 month'::interval)::date AS month_start
),
seed AS (
  SELECT
    a.id AS account_id,
    a.account_number,
    a.building_label,
    m.month_start,
    (m.month_start + interval '1 month' - interval '1 day')::date AS month_end,
    (m.month_start + interval '1 month' + interval '10 days')::date AS billing_date,
    (m.month_start + interval '1 month' + interval '30 days')::date AS due_date,
    -- Baseline consumption profile by account
    CASE
      WHEN a.account_number = '2745714336' THEN
        -- Building 8: near-zero while vacant (Aug 2023–Dec 2024), then normal; estimated spike Apr 2024–Jan 2026
        CASE
          WHEN m.month_start >= '2023-08-01' AND m.month_start < '2025-01-01' THEN 0::numeric
          WHEN m.month_start >= '2025-01-01' THEN 45000 + (extract(month FROM m.month_start)::int % 5) * 2500
          ELSE 38000 + (extract(month FROM m.month_start)::int % 4) * 2000
        END
      WHEN a.account_number = '1674911185' THEN 8000 + (extract(month FROM m.month_start)::int % 6) * 1500
      WHEN a.account_number = '8082997418' THEN 4000 + (extract(month FROM m.month_start)::int % 5) * 800
      WHEN a.account_number = '4621903166' THEN
        CASE WHEN m.month_start < '2024-08-01' THEN NULL
             ELSE 500 + (extract(month FROM m.month_start)::int % 3) * 200 END
      WHEN a.account_number = '9952938168' THEN 12000 + (extract(month FROM m.month_start)::int % 7) * 1800
      WHEN a.account_number = '13120-NW32' THEN 9000 + (extract(month FROM m.month_start)::int % 5) * 1200
      WHEN a.account_number = '13120-PORT' THEN 7000 + (extract(month FROM m.month_start)::int % 4) * 1000
      WHEN a.account_number = '13250-ALEX' THEN 6500 + (extract(month FROM m.month_start)::int % 6) * 900
      WHEN a.account_number = '13410-ASWAN' THEN 11000 + (extract(month FROM m.month_start)::int % 5) * 1400
      ELSE 5000 + (extract(month FROM m.month_start)::int % 4) * 700
    END AS gallons_actual,
    CASE
      WHEN a.account_number = '2745714336'
        AND m.month_start >= '2024-04-01'
        AND m.month_start < '2026-02-01'
      THEN true ELSE false
    END AS is_estimated
  FROM public.water_service_accounts a
  CROSS JOIN months m
  CROSS JOIN prop
  WHERE a.property_id = prop.property_id
),
priced AS (
  SELECT
    s.*,
    CASE
      WHEN s.gallons_actual IS NULL THEN NULL
      WHEN s.is_estimated AND s.account_number = '2745714336' THEN 216000::numeric
      ELSE s.gallons_actual
    END AS gallons_billed
  FROM seed s
),
final AS (
  SELECT
    prop.tenant_id,
    prop.property_id,
    p.account_id,
    p.month_start AS bill_period_start,
    p.month_end AS bill_period_end,
    p.billing_date,
    p.due_date,
    p.gallons_billed AS consumption_gallons,
    p.is_estimated,
    ROUND((p.gallons_billed / 1000.0) * 18.50, 2) AS water_charges,
    ROUND((p.gallons_billed / 1000.0) * 22.75, 2) AS sewer_charges,
    ROUND((p.gallons_billed / 1000.0) * 1.85, 2) AS other_fees,
    CASE
      WHEN p.is_estimated THEN 'disputed'
      WHEN p.billing_date < CURRENT_DATE - 45 THEN 'paid'
      WHEN p.billing_date < CURRENT_DATE - 20 THEN 'past_due'
      ELSE 'open'
    END AS status
  FROM priced p
  CROSS JOIN prop
  WHERE p.gallons_billed IS NOT NULL
)
INSERT INTO public.water_bills (
  tenant_id, property_id, account_id,
  bill_period_start, bill_period_end, billing_date, due_date,
  previous_balance, current_charges, amount_due, amount_paid,
  water_charges, sewer_charges, other_fees,
  consumption_gallons, days_of_service, is_estimated, status, source, notes
)
SELECT
  f.tenant_id, f.property_id, f.account_id,
  f.bill_period_start, f.bill_period_end, f.billing_date, f.due_date,
  0,
  f.water_charges + f.sewer_charges + f.other_fees,
  CASE WHEN f.status = 'paid' THEN 0 ELSE f.water_charges + f.sewer_charges + f.other_fees END,
  CASE WHEN f.status = 'paid' THEN f.water_charges + f.sewer_charges + f.other_fees ELSE 0 END,
  f.water_charges, f.sewer_charges, f.other_fees,
  f.consumption_gallons, 30, f.is_estimated, f.status, 'seed',
  CASE WHEN f.is_estimated THEN 'Office estimate — dispute candidate' ELSE NULL END
FROM final f
WHERE NOT EXISTS (
  SELECT 1 FROM public.water_bills b
  WHERE b.account_id = f.account_id
    AND b.bill_period_start = f.bill_period_start
);

-- Seed a starter executive note
INSERT INTO public.water_exec_notes (tenant_id, property_id, account_id, author_name, author_email, body, is_shared)
SELECT
  p.workspace_id,
  p.id,
  a.id,
  'APAS Consulting',
  'hardeep@apas.ai',
  'Water Intelligence online for Glorieta Gardens. Building 8 (13200 Alexandria / acct 2745714336) carries the formal dispute for estimated usage (~216k gal/mo) during the vacant/rehab window. Review the Actionable Insights panel and the dispute brief before the next Opa-locka meeting.',
  true
FROM public.properties p
JOIN public.water_service_accounts a
  ON a.property_id = p.id AND a.account_number = '2745714336'
WHERE lower(p.name) LIKE '%glorieta%'
  AND NOT EXISTS (
    SELECT 1 FROM public.water_exec_notes n WHERE n.property_id = p.id
  )
LIMIT 1;

COMMIT;
