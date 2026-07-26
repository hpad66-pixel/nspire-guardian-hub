-- Editable-with-formatting (PR3i). Users need to edit the uploaded letter ON its
-- real formatting (letterhead, fonts, spacing) and SAVE it with that formatting
-- preserved — the plain "edit copy" was worthless. We render the .docx faithfully
-- (docx-preview → styled HTML) and let the user edit it in place; the edited,
-- still-styled HTML is saved here. original_base64 stays the untouched original.
ALTER TABLE public.authored_documents ADD COLUMN IF NOT EXISTS edited_html text;   -- faithful render, edited + saved (styles inline)

NOTIFY pgrst, 'reload schema';
