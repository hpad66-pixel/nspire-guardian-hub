-- ============================================================
-- WS-6 · photo_links tenant-boundary trigger.
-- ============================================================
-- A photo belonging to tenant A must NOT be linkable to a daily report
-- belonging to tenant B. The same-tenant link must still succeed.
-- Run via: supabase test db
-- ============================================================

BEGIN;
SELECT plan(2);

-- ------------------------------------------------------------
-- Fixtures: two workspaces, each with its own property -> project.
-- ------------------------------------------------------------
INSERT INTO public.workspaces (id, name)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tenant B');

INSERT INTO public.properties (id, name, address, city, state, workspace_id)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Prop A', '1 A St', 'Austin', 'TX',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('b1111111-1111-1111-1111-111111111111', 'Prop B', '1 B St', 'Boston', 'MA',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

INSERT INTO public.projects (id, property_id, name)
VALUES
  ('a2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'Proj A'),
  ('b2222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', 'Proj B');

-- Daily report under tenant B's project.
INSERT INTO public.daily_reports (id, project_id, work_performed)
VALUES
  ('b3333333-3333-3333-3333-333333333333', 'b2222222-2222-2222-2222-222222222222', 'B work');

-- Photo owned by tenant A.
INSERT INTO public.photos (id, tenant_id, project_id, storage_path)
VALUES
  ('a4444444-4444-4444-4444-444444444444',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'a2222222-2222-2222-2222-222222222222',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/a2222222-2222-2222-2222-222222222222/a.jpg');

-- Photo owned by tenant B (for the positive case).
INSERT INTO public.photos (id, tenant_id, project_id, storage_path)
VALUES
  ('b4444444-4444-4444-4444-444444444444',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'b2222222-2222-2222-2222-222222222222',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/b2222222-2222-2222-2222-222222222222/b.jpg');

-- ------------------------------------------------------------
-- 1. Cross-tenant link is rejected by the boundary trigger.
-- ------------------------------------------------------------
SELECT throws_ok(
  $$ INSERT INTO public.photo_links (photo_id, linked_record_id, linked_record_type)
     VALUES ('a4444444-4444-4444-4444-444444444444',
             'b3333333-3333-3333-3333-333333333333', 'daily') $$,
  '42501',
  NULL,
  'tenant-A photo cannot be linked to a tenant-B daily report'
);

-- ------------------------------------------------------------
-- 2. Same-tenant link succeeds (tenant-B photo -> tenant-B daily report).
-- ------------------------------------------------------------
SELECT lives_ok(
  $$ INSERT INTO public.photo_links (photo_id, linked_record_id, linked_record_type)
     VALUES ('b4444444-4444-4444-4444-444444444444',
             'b3333333-3333-3333-3333-333333333333', 'daily') $$,
  'tenant-B photo links to its own tenant-B daily report'
);

SELECT * FROM finish();
ROLLBACK;
