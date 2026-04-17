-- ============================================================
-- Feature Registry: single source of truth for every route,
-- page, edge function, integration, and experiment in the app.
--
-- Phase 1 of the module consolidation plan. See
-- docs/PumpIQ-Module-Consolidation-Plan.md for the full spec.
--
-- This migration creates:
--   * feature_registry           — one row per feature
--   * feature_registry_events    — immutable audit log
--   * RLS policies gating both to the admin role
--   * trigger that logs lifecycle / visibility / owner changes
-- ============================================================

-- ── 1. feature_registry ───────────────────────────────────────
CREATE TABLE public.feature_registry (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                text NOT NULL UNIQUE,
  kind                text NOT NULL CHECK (kind IN (
                        'module','route','page','edge_function','integration','experiment'
                      )),
  display_name        text NOT NULL,
  module              text NOT NULL,
  path                text,
  lifecycle           text NOT NULL CHECK (lifecycle IN (
                        'LIVE','PREVIEW','LAB','ARCHIVED','DEPRECATED'
                      )),
  visibility          text NOT NULL DEFAULT 'public' CHECK (visibility IN (
                        'public','tenant','admin'
                      )),
  owner               text,
  description         text,
  rationale           text,
  depends_on          text[] NOT NULL DEFAULT '{}',
  last_verified_at    timestamptz,
  verified_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  opa_locka_in_use    boolean NOT NULL DEFAULT false,
  analytics_event     text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_feature_registry_lifecycle ON public.feature_registry (lifecycle);
CREATE INDEX idx_feature_registry_module    ON public.feature_registry (module);
CREATE INDEX idx_feature_registry_kind      ON public.feature_registry (kind);
CREATE INDEX idx_feature_registry_visibility ON public.feature_registry (visibility);

ALTER TABLE public.feature_registry ENABLE ROW LEVEL SECURITY;

-- Admin-only full access. Non-admins read a filtered subset through the
-- registry_public_read policy below.
CREATE POLICY "registry_admin_all"
  ON public.feature_registry
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can read LIVE + PREVIEW entries so that the
-- useFeatureFlag hook works for end users without exposing LAB / ARCHIVED
-- / DEPRECATED content.
CREATE POLICY "registry_public_read_visible"
  ON public.feature_registry
  FOR SELECT
  USING (
    lifecycle IN ('LIVE','PREVIEW')
    AND visibility IN ('public','tenant')
  );

-- ── 2. updated_at trigger ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.feature_registry_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_feature_registry_updated_at
  BEFORE UPDATE ON public.feature_registry
  FOR EACH ROW
  EXECUTE FUNCTION public.feature_registry_set_updated_at();

-- ── 3. feature_registry_events (audit log) ───────────────────
CREATE TABLE public.feature_registry_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id      uuid NOT NULL REFERENCES public.feature_registry(id) ON DELETE CASCADE,
  slug            text NOT NULL,
  changed_field   text NOT NULL,
  old_value       text,
  new_value       text,
  actor           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason          text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_feature_registry_events_feature ON public.feature_registry_events (feature_id);
CREATE INDEX idx_feature_registry_events_slug    ON public.feature_registry_events (slug);
CREATE INDEX idx_feature_registry_events_created ON public.feature_registry_events (created_at DESC);

ALTER TABLE public.feature_registry_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "registry_events_admin_read"
  ON public.feature_registry_events
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Writes only happen through the trigger below, which runs as SECURITY DEFINER.
-- No direct INSERT policy needed.

-- ── 4. audit trigger ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.feature_registry_log_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.feature_registry_events (feature_id, slug, changed_field, old_value, new_value, actor)
    VALUES (NEW.id, NEW.slug, 'created', NULL, NEW.lifecycle, v_actor);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.lifecycle IS DISTINCT FROM OLD.lifecycle THEN
      INSERT INTO public.feature_registry_events (feature_id, slug, changed_field, old_value, new_value, actor)
      VALUES (NEW.id, NEW.slug, 'lifecycle', OLD.lifecycle, NEW.lifecycle, v_actor);
    END IF;
    IF NEW.visibility IS DISTINCT FROM OLD.visibility THEN
      INSERT INTO public.feature_registry_events (feature_id, slug, changed_field, old_value, new_value, actor)
      VALUES (NEW.id, NEW.slug, 'visibility', OLD.visibility, NEW.visibility, v_actor);
    END IF;
    IF NEW.owner IS DISTINCT FROM OLD.owner THEN
      INSERT INTO public.feature_registry_events (feature_id, slug, changed_field, old_value, new_value, actor)
      VALUES (NEW.id, NEW.slug, 'owner', OLD.owner, NEW.owner, v_actor);
    END IF;
    IF NEW.last_verified_at IS DISTINCT FROM OLD.last_verified_at THEN
      INSERT INTO public.feature_registry_events (feature_id, slug, changed_field, old_value, new_value, actor)
      VALUES (
        NEW.id, NEW.slug, 'last_verified_at',
        COALESCE(OLD.last_verified_at::text, ''),
        COALESCE(NEW.last_verified_at::text, ''),
        v_actor
      );
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.feature_registry_events (feature_id, slug, changed_field, old_value, new_value, actor)
    VALUES (OLD.id, OLD.slug, 'deleted', OLD.lifecycle, NULL, v_actor);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_feature_registry_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.feature_registry
  FOR EACH ROW
  EXECUTE FUNCTION public.feature_registry_log_changes();
