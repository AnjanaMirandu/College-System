const supabase = require('../config/db');
const { sendMeetingReminderEmail } = require('./emailService');

const DEFAULT_REMINDER_HOURS_BEFORE = 2;
const DEFAULT_REMINDER_INTERVAL_MINUTES = 15;

const parsePositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getReminderHoursBefore = () => parsePositiveNumber(
  process.env.MEETING_REMINDER_HOURS_BEFORE,
  DEFAULT_REMINDER_HOURS_BEFORE,
);

const getReminderIntervalMinutes = () => parsePositiveNumber(
  process.env.MEETING_REMINDER_INTERVAL_MINUTES,
  DEFAULT_REMINDER_INTERVAL_MINUTES,
);

const getReminderIntervalMs = () => getReminderIntervalMinutes() * 60 * 1000;

const isMissingReminderColumn = (error) => (
  error?.message?.includes('reminder_sent_at')
  || error?.message?.includes("Could not find the 'reminder_sent_at' column")
);

const getVilniusOffsetMs = (date) => {
  const offsetName = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Vilnius',
    timeZoneName: 'shortOffset',
  }).formatToParts(date).find((part) => part.type === 'timeZoneName')?.value || 'GMT+0';

  const match = offsetName.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
  if (!match) {
    return 0;
  }

  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  return sign * ((hours * 60) + minutes) * 60 * 1000;
};

const parseMeetingDate = (value) => {
  const stringValue = String(value || '');
  if (!stringValue || /[zZ]|[+-]\d{2}:\d{2}$/.test(stringValue)) {
    return new Date(value);
  }

  const match = stringValue.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) {
    return new Date(value);
  }

  const [, year, month, day, hour, minute, second = '0'] = match;
  const utcGuess = new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  ));

  return new Date(utcGuess.getTime() - getVilniusOffsetMs(utcGuess));
};

const getUpcomingUnsentRegistrations = async ({ now, cutoff }) => {
  const { data, error } = await supabase
    .from('registrations')
    .select(`
      id,
      parent_name,
      parent_email,
      child_name,
      child_class,
      note,
      reminder_sent_at,
      status,
      slots(start_time, end_time),
      teachers(name, subject, room)
    `)
    .is('reminder_sent_at', null)
    .not('parent_email', 'is', null)
    .or('status.is.null,status.neq.cancelled')
    .limit(500);

  if (error) {
    if (isMissingReminderColumn(error)) {
      console.error('Meeting reminder column is missing. Run the latest schema.sql or seed.sql migration.');
      return [];
    }

    throw error;
  }

  return (data || []).filter((registration) => {
    const startTime = parseMeetingDate(registration.slots?.start_time);
    return (
      !Number.isNaN(startTime.getTime())
      && startTime > now
      && startTime <= cutoff
    );
  });
};

const markReminderSent = async (registrationId) => {
  const { error } = await supabase
    .from('registrations')
    .update({ reminder_sent_at: new Date().toISOString() })
    .eq('id', registrationId)
    .is('reminder_sent_at', null);

  if (error) {
    throw error;
  }
};

const sendReminderForRegistration = async (registration) => {
  await sendMeetingReminderEmail({
    to: registration.parent_email,
    parentName: registration.parent_name,
    childName: registration.child_name,
    childClass: registration.child_class,
    teacherName: registration.teachers?.name,
    teacherSubject: registration.teachers?.subject,
    teacherRoom: registration.teachers?.room,
    startTime: registration.slots?.start_time,
    endTime: registration.slots?.end_time,
    note: registration.note,
  });

  await markReminderSent(registration.id);
};

const processUpcomingMeetingReminders = async () => {
  const now = new Date();
  const lookaheadMs = (
    (getReminderHoursBefore() * 60) + getReminderIntervalMinutes()
  ) * 60 * 1000;
  const cutoff = new Date(now.getTime() + lookaheadMs);
  const registrations = await getUpcomingUnsentRegistrations({ now, cutoff });
  let sent = 0;

  for (const registration of registrations) {
    try {
      await sendReminderForRegistration(registration);
      sent += 1;
    } catch (error) {
      console.error(`Meeting reminder failed for registration ${registration.id}:`, error.message);
    }
  }

  return { checked: registrations.length, sent };
};

const startMeetingReminderScheduler = () => {
  if (process.env.MEETING_REMINDERS_DISABLED === 'true') {
    return null;
  }

  const run = () => {
    processUpcomingMeetingReminders().catch((error) => {
      console.error('Meeting reminder scheduler failed:', error.message);
    });
  };

  run();
  return setInterval(run, getReminderIntervalMs());
};

module.exports = {
  processUpcomingMeetingReminders,
  startMeetingReminderScheduler,
};
