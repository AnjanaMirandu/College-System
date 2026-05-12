-- Restart ID counters for tables that are currently empty.
-- Run this in the Supabase SQL editor after deleting table rows during testing.
--
-- This does not delete data. It only resets the next ID value for tables that
-- have no rows. If a table still has rows, the next ID becomes max(id) + 1.

SELECT setval(pg_get_serial_sequence('teachers', 'id'), COALESCE((SELECT MAX(id) FROM teachers), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('slots', 'id'), COALESCE((SELECT MAX(id) FROM slots), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('registrations', 'id'), COALESCE((SELECT MAX(id) FROM registrations), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('parents', 'id'), COALESCE((SELECT MAX(id) FROM parents), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('auth_logs', 'id'), COALESCE((SELECT MAX(id) FROM auth_logs), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('admin_audit_logs', 'id'), COALESCE((SELECT MAX(id) FROM admin_audit_logs), 0) + 1, false);

NOTIFY pgrst, 'reload schema';
