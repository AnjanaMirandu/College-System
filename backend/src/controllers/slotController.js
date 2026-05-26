const supabase = require('../config/db');
const { readRegistrationSettings } = require('../services/registrationSettingsStore');

const isMissingRegistrationSettingsTable = (error) => (
  error?.message?.includes("Could not find the table 'public.registration_settings'")
  || error?.message?.includes('relation "public.registration_settings" does not exist')
);

const getRegistrationSettings = async () => {
  const { data, error } = await supabase
    .from('registration_settings')
    .select('is_open, opens_at, closes_at')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    if (isMissingRegistrationSettingsTable(error)) {
      const settings = await readRegistrationSettings();

      return { settings, error: null };
    }

    return { settings: null, error };
  }

  return { settings: data, error: null };
};

const toVilniusDateTimeLocal = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Vilnius',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}`;
};

const toComparableDateTimeLocal = (value) => {
  if (!value) {
    return '';
  }

  const stringValue = String(value);
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(stringValue)) {
    const date = new Date(stringValue);
    return Number.isNaN(date.getTime()) ? '' : toVilniusDateTimeLocal(date);
  }

  return stringValue.slice(0, 16);
};

const isRegistrationOpenNow = (settings) => {
  if (!settings?.is_open) {
    return false;
  }

  const now = toVilniusDateTimeLocal();
  const opensAt = toComparableDateTimeLocal(settings.opens_at);
  const closesAt = toComparableDateTimeLocal(settings.closes_at);

  return (!opensAt || opensAt <= now) && (!closesAt || closesAt >= now);
};

const getTeachers = async (req, res) => {
  const registrationSettings = await getRegistrationSettings();
  if (registrationSettings.error) {
    return res.status(500).json({ message: 'Unable to check registration period' });
  }
  if (!isRegistrationOpenNow(registrationSettings.settings)) {
    return res.status(403).json({ message: 'Registration is currently closed by the administrator.' });
  }

  const { data, error } = await supabase
    .from('teachers')
    .select('id, name, subject, room')
    .order('name', { ascending: true });

  if (error) {
    return res.status(500).json({ message: 'Error fetching teachers' });
  }

  res.json(data);
};

const getTeacherSlots = async (req, res) => {
  const { teacherId } = req.params;

  const registrationSettings = await getRegistrationSettings();
  if (registrationSettings.error) {
    return res.status(500).json({ message: 'Unable to check registration period' });
  }
  if (!isRegistrationOpenNow(registrationSettings.settings)) {
    return res.status(403).json({ message: 'Registration is currently closed by the administrator.' });
  }

  const { data, error } = await supabase
    .from('slots')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('is_booked', false)
    .gt('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .order('end_time', { ascending: true });

  if (error) {
    return res.status(500).json({ message: 'Error fetching slots' });

  }

  res.json(data);
};

module.exports = { getTeachers, getTeacherSlots };
