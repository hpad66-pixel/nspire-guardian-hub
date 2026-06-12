-- ============================================================
-- WS-3 · #19 · Non-destructive void for project change orders.
-- ============================================================
-- The change_order_status enum has no 'void' value and the table
-- has no void marker, so the UI had no safe way to cancel a change
-- order. Per the standing rule (prefer void over hard DELETE for
-- financial records), add a voided_at / voided_by marker instead of
-- a destructive delete. RLS on change_orders already scopes the row;
-- a column add needs no new policy.
-- ============================================================

BEGIN;

ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES auth.users(id);

COMMENT ON COLUMN public.change_orders.voided_at IS
  'When set, the change order is voided (soft-cancelled). Never hard-deleted.';

COMMIT;
