-- Adds one-time email reminders for booked parent-teacher meetings.

ALTER TABLE registrations
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
