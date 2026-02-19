
-- Equipment & Fleet Tracker Migration

-- 1. Platform master category list
CREATE TABLE public.equipment_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.equipment_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users view categories"
  ON public.equipment_categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admin manages categories"
  ON public.equipment_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Seed master categories
INSERT INTO public.equipment_categories (name, slug, icon, sort_order) VALUES
  ('Vehicles', 'vehicles', 'Truck', 1),
  ('Heavy Equipment', 'heavy-equipment', 'Construction', 2),
  ('Tools & Equipment', 'tools', 'Wrench', 3),
  ('Field & Testing Equipment', 'field-equipment', 'FlaskConical', 4),
  ('Trailers & Attachments', 'trailers', 'Package', 5),
  ('Safety Equipment', 'safety-equipment', 'ShieldCheck', 6),
  ('Office & Tech Equipment', 'office-tech', 'Monitor', 7);

-- 2. Org equipment configuration
CREATE TABLE public.workspace_equipment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE,
  active_category_slugs TEXT[] NOT NULL DEFAULT '{}',
  custom_category_name TEXT,
  custom_category_icon TEXT DEFAULT 'Box',
  setup_completed BOOLEAN NOT NULL DEFAULT false,
  asset_limit INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_equipment_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins manage own config"
  ON public.workspace_equipment_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Members view own org config"
  ON public.workspace_equipment_config FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.profiles
      WHERE user_id = auth.uid()
    )
  );

-- 3. Equipment assets
CREATE TABLE public.equipment_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  asset_tag TEXT,
  category_slug TEXT NOT NULL,
  make TEXT,
  model TEXT,
  year INTEGER,
  serial_number TEXT,
  vin TEXT,
  license_plate TEXT,
  color TEXT,
  assigned_to UUID REFERENCES public.profiles(user_id),
  assigned_location TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  condition TEXT NOT NULL DEFAULT 'good',
  notes TEXT,
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.equipment_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view workspace assets"
  ON public.equipment_assets FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Managers manage assets"
  ON public.equipment_assets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner', 'manager')
    )
  );

-- 4. Asset documents (expiry tracking)
CREATE TABLE public.equipment_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.equipment_assets(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  custom_type_label TEXT,
  document_number TEXT,
  issuing_authority TEXT,
  issue_date DATE,
  expiry_date DATE,
  document_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  uploaded_by UUID NOT NULL REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.equipment_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view equipment documents"
  ON public.equipment_documents FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Managers manage equipment documents"
  ON public.equipment_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner', 'manager')
    )
  );

-- 5. Check-out log
CREATE TABLE public.equipment_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.equipment_assets(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  checked_out_by UUID NOT NULL REFERENCES public.profiles(user_id),
  checked_out_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expected_return DATE,
  purpose TEXT,
  destination TEXT,
  checked_in_by UUID REFERENCES public.profiles(user_id),
  checked_in_at TIMESTAMPTZ,
  return_notes TEXT,
  condition_on_return TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.equipment_checkouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view checkouts"
  ON public.equipment_checkouts FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can check out"
  ON public.equipment_checkouts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Members can check in"
  ON public.equipment_checkouts FOR UPDATE
  USING (
    checked_out_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner', 'manager')
    )
  );

-- 6. Indexes
CREATE INDEX idx_equipment_assets_workspace ON public.equipment_assets(workspace_id);
CREATE INDEX idx_equipment_assets_status ON public.equipment_assets(status);
CREATE INDEX idx_equipment_assets_category ON public.equipment_assets(category_slug);
CREATE INDEX idx_equipment_assets_active ON public.equipment_assets(is_active);
CREATE INDEX idx_equipment_documents_asset ON public.equipment_documents(asset_id);
CREATE INDEX idx_equipment_documents_expiry ON public.equipment_documents(expiry_date);
CREATE INDEX idx_equipment_documents_status ON public.equipment_documents(status);
CREATE INDEX idx_equipment_checkouts_asset ON public.equipment_checkouts(asset_id);
CREATE INDEX idx_equipment_checkouts_active ON public.equipment_checkouts(is_active);
CREATE INDEX idx_equipment_checkouts_user ON public.equipment_checkouts(checked_out_by);
CREATE INDEX idx_workspace_equipment_config_workspace ON public.workspace_equipment_config(workspace_id);

-- 7. Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('equipment-photos', 'equipment-photos', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('equipment-documents', 'equipment-documents', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Members view equipment photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'equipment-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Managers upload equipment photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'equipment-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Members view equipment docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'equipment-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Managers upload equipment docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'equipment-documents' AND auth.uid() IS NOT NULL);
