-- Reset the demo database and restart all ID counters from 1.
-- Run this in the Supabase SQL editor when you want a clean testing database.
--
-- WARNING:
-- This deletes all existing teachers, parents, slots, registrations, auth logs,
-- admin audit logs, and registration settings. It is intended for development
-- and testing only.

TRUNCATE TABLE
  registrations,
  slots,
  teachers,
  parents,
  auth_logs,
  admin_audit_logs,
  registration_settings
RESTART IDENTITY CASCADE;

INSERT INTO registration_settings (id, is_open)
VALUES (1, TRUE)
ON CONFLICT (id) DO UPDATE SET
  is_open = EXCLUDED.is_open,
  updated_at = NOW();

NOTIFY pgrst, 'reload schema';
