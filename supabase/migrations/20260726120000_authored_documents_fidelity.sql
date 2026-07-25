-- Authored documents — 100% fidelity (PR3h). The prior version converted uploads
-- to HTML (mammoth), which destroys Word letterhead/fonts/spacing. We now keep the
-- ORIGINAL file byte-for-byte alongside the row (base64; documents are small and
-- this keeps them tenant-isolated with no separate storage/RLS plumbing) so the
-- preview is faithful and the download is exact. content_html/content_text remain
-- ONLY for the optional best-effort "edit copy" and the knowledge base — never the
-- source of truth.

ALTER TABLE public.authored_documents ADD COLUMN IF NOT EXISTS original_base64 text;   -- the exact uploaded file
ALTER TABLE public.authored_documents ADD COLUMN IF NOT EXISTS mime_type text;
ALTER TABLE public.authored_documents ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE public.authored_documents ADD COLUMN IF NOT EXISTS has_original boolean NOT NULL DEFAULT false;

-- content_html was NOT NULL DEFAULT '<p></p>' — a preserved upload may legitimately
-- have no editable HTML until the user makes an edit copy, so relax it.
ALTER TABLE public.authored_documents ALTER COLUMN content_html DROP NOT NULL;

NOTIFY pgrst, 'reload schema';
