-- Run this in the Supabase SQL editor if parent registration fails because
-- child_name or child_class is missing from the parents table.

ALTER TABLE parents
ADD COLUMN IF NOT EXISTS child_name TEXT;

ALTER TABLE parents
ADD COLUMN IF NOT EXISTS child_class TEXT;

NOTIFY pgrst, 'reload schema';
