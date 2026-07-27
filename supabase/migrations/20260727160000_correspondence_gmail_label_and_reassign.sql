-- Correction workflow (PR3p) — when the sync (or the classifier) gets a thread
-- wrong, the user needs to move it to the right project and/or fix its topic,
-- and optionally push the correct Gmail label. gmail_label_id is the Gmail label
-- to apply for THIS project's single merged topic (the "one label per project"
-- pattern already in use) — stored as the label's stable id, not its display name,
-- so applying it never depends on name-matching.
ALTER TABLE public.correspondence_settings ADD COLUMN IF NOT EXISTS gmail_label_id text;

-- Backfill the four labels already created for the four configured projects.
UPDATE public.correspondence_settings SET gmail_label_id = 'Label_17' WHERE project_id = '9420b571-3383-4bd0-a64f-096634dd1ade';   -- Glorieta — Projects/Glorieta/Water
UPDATE public.correspondence_settings SET gmail_label_id = 'Label_19' WHERE project_id = '332ee1d6-b165-4893-bd25-c31a212e206e';   -- MRI Building — Projects/Larkin-MRI/Contamination-Stormwater
UPDATE public.correspondence_settings SET gmail_label_id = 'Label_21' WHERE project_id = '72c7ce60-d9b8-46d3-ba7d-c1e9a6f02f47';   -- COOL PWD Projects — Projects/COOL-PWD/Public-Works
UPDATE public.correspondence_settings SET gmail_label_id = 'Label_23' WHERE project_id = '4b168bb0-a0a0-4c0a-bcd8-eb56ec2f413d';   -- Sewer Ext Project — Projects/Sewer-Ext/Sewer-Stormwater

NOTIFY pgrst, 'reload schema';
