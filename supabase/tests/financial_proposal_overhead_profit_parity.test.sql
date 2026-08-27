BEGIN;
SELECT plan(8);

SELECT has_column('public', 'proposals', 'overhead_pct', 'proposals has overhead_pct');
SELECT has_column('public', 'proposals', 'profit_pct', 'proposals has profit_pct');
SELECT col_not_null('public', 'proposals', 'overhead_pct', 'overhead_pct is required');
SELECT col_not_null('public', 'proposals', 'profit_pct', 'profit_pct is required');
SELECT col_default_is('public', 'proposals', 'overhead_pct', '10', 'overhead defaults to 10%');
SELECT col_default_is('public', 'proposals', 'profit_pct', '5', 'profit defaults to 5%');
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.proposals'::regclass
      AND conname = 'proposals_overhead_pct_range'
      AND contype = 'c'
  ),
  'overhead percentage is range checked'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.proposals'::regclass
      AND conname = 'proposals_profit_pct_range'
      AND contype = 'c'
  ),
  'profit percentage is range checked'
);

SELECT * FROM finish();
ROLLBACK;
