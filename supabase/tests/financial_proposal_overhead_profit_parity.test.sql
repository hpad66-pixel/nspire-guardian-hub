BEGIN;
SELECT plan(8);

SELECT has_column('public', 'proposals', 'overhead_pct', 'proposals has overhead_pct');
SELECT has_column('public', 'proposals', 'profit_pct', 'proposals has profit_pct');
SELECT col_not_null('public', 'proposals', 'overhead_pct', 'overhead_pct is required');
SELECT col_not_null('public', 'proposals', 'profit_pct', 'profit_pct is required');
SELECT col_default_is('public', 'proposals', 'overhead_pct', '10', 'overhead defaults to 10%');
SELECT col_default_is('public', 'proposals', 'profit_pct', '5', 'profit defaults to 5%');
SELECT has_check('public', 'proposals', 'proposals_overhead_pct_range', 'overhead percentage is range checked');
SELECT has_check('public', 'proposals', 'proposals_profit_pct_range', 'profit percentage is range checked');

SELECT * FROM finish();
ROLLBACK;
