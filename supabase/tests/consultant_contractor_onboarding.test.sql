BEGIN;
SELECT plan(8);

SELECT has_column('public', 'contractor_qualification_cases', 'engagement_type', 'qualification stores contractor or consultant type');
SELECT has_column('public', 'contractor_qualification_cases', 'certificate_holder_name', 'qualification stores certificate holder');
SELECT has_column('public', 'contractor_qualification_cases', 'certificate_holder_address', 'qualification stores certificate holder address');
SELECT has_column('public', 'contractor_qualification_cases', 'additional_insured_name', 'qualification stores additional insured wording');
SELECT has_column('public', 'contractor_qualification_cases', 'insurance_instructions', 'qualification stores insurance instructions');
SELECT has_column('public', 'contractor_requirement_items', 'applies_to', 'template requirement stores its intended audience');
SELECT has_column('public', 'contractor_case_requirements', 'applies_to', 'case snapshot preserves its intended audience');
SELECT has_function(
  'public',
  'create_contractor_qualification_case',
  ARRAY['uuid','uuid','uuid','text','text','text','text','text','text'],
  'case factory accepts engagement and insurance context'
);

SELECT * FROM finish();
ROLLBACK;
