-- A door photo per unit, shown on the unit tile. Public bucket (door photos aren't
-- sensitive) so the tile can render via a public URL; writes are authenticated.
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS photo_path text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('unit-photos', 'unit-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "unit_photos_read" ON storage.objects;
CREATE POLICY "unit_photos_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'unit-photos');

DROP POLICY IF EXISTS "unit_photos_insert" ON storage.objects;
CREATE POLICY "unit_photos_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'unit-photos');

DROP POLICY IF EXISTS "unit_photos_update" ON storage.objects;
CREATE POLICY "unit_photos_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'unit-photos');

DROP POLICY IF EXISTS "unit_photos_delete" ON storage.objects;
CREATE POLICY "unit_photos_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'unit-photos');
