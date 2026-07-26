-- Per-project topic taxonomy (PR3m). gmail-sync's topic list, search keywords, and
-- classifier definitions were hardcoded to Glorieta's water-billing language —
-- meaning every OTHER project's sync was either blind (no real scoping direction)
-- or silently forced through the wrong taxonomy. This makes both project-specific:
--   • topics       — this project's own {key,label,description} taxonomy
--   • extra_terms  — becomes the project's OPTIONAL keyword net (previously ANDed
--                    with a hardcoded water-term list; now the only term filter,
--                    so a project with no configured terms isn't wrongly excluded
--                    by someone else's keywords).
ALTER TABLE public.correspondence_settings ADD COLUMN IF NOT EXISTS topics jsonb NOT NULL DEFAULT '[]';

-- Backfill Glorieta's existing row so its behavior is unchanged after the
-- generalization below removes the hardcoded water taxonomy from the code.
UPDATE public.correspondence_settings
SET topics = '[
  {"key":"water_billing","label":"Water billing","description":"Water/sewer utility BILLING: invoices, charges, meter reads driving a bill, consumption disputes, shut-off/reconnection, formal disputes of water & sewer CHARGES."},
  {"key":"water_meters","label":"Water meters","description":"Physical water METERS: installation, testing, relocation, meter channels, backflow preventers tied to metering."},
  {"key":"sewer_extension","label":"Sewer extension","description":"SANITARY SEWER construction: sewer main/line replacement or extension, DERM/FDEP certifications, as-builts, manholes, sewer permits. (NOT billing.)"},
  {"key":"stormwater","label":"Storm water","description":"Storm water / drainage: retention ponds, catch basins, street sweeping, silt fence, stormwater fixtures."},
  {"key":"other","label":"Other","description":"Anything else, including a different project, newsletters, internal admin, or unrelated business."}
]'::jsonb,
extra_terms = COALESCE(extra_terms, '(water OR "water meter" OR meter OR meters OR billing OR bill OR utility OR consumption OR dispute OR charges OR WASD OR backflow OR "meter reading" OR "shut off" OR reconnection)')
WHERE project_id = '9420b571-3383-4bd0-a64f-096634dd1ade';

NOTIFY pgrst, 'reload schema';
