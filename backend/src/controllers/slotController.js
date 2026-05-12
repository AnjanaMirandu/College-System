const supabase = require('../config/db');
const { readRegistrationSettings } = require('../services/registrationSettingsStore');

const isMissingRegistrationSettingsTable = (error) => (
  error?.message?.includes("Could not find the table 'public.registration_settings'")
  || error?.message?.includes('relation "public.registration_settings" does not exist')
);

const getActiveRegistrationSettings = async () => {
  const { data, error } = await supabase
    .from('registration_settings')
    .select('is_open, opens_at, closes_at')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    if (isMissingRegistrationSettingsTable(error)) {
      const settings = await readRegistrationSettings();
      const now = new Date();
      const opensAt = settings?.opens_at ? new Date(settings.opens_at) : null;
      const closesAt = settings?.closes_at ? new Date(settings.closes_at) : null;
      const withinDates = (!opensAt || opensAt <= now) && (!closesAt || closesAt >= now);

      return { isActive: Boolean(settings?.is_open && withinDates), error: null };
    }

    return { isActive: false, error };
  }

  const now = new Date();
  const opensAt = data?.opens_at ? new Date(data.opens_at) : null;
  const closesAt = data?.closes_at ? new Date(data.closes_at) : null;
  const withinDates = (!opensAt || opensAt <= now) && (!closesAt || closesAt >= now);

  return {
    isActive: Boolean(data?.is_open && withinDates),
    error: null,
  };
};

const getTeachers = async (req, res) => {
  const { data, error } = await supabase
    .from('teachers')
    .select('id, name, subject, room');

  if (error) {
    return res.status(500).json({ message: 'Error fetching teachers' });
  }

  res.json(data);
};

const getTeacherSlots = async (req, res) => {
  const { teacherId } = req.params;

  const registrationSettings = await getActiveRegistrationSettings();
  if (registrationSettings.error) {
    return res.status(500).json({ message: 'Unable to check registration period' });
  }
  if (!registrationSettings.isActive) {
    return res.status(403).json({ message: 'Registration is currently closed by the administrator.' });
  }

  const { data, error } = await supabase
    .from('slots')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('is_booked', false)
    .gt('start_time', new Date().toISOString());

  if (error) {
    return res.status(500).json({ message: 'Error fetching slots' });

  }

  res.json(data);
};

module.exports = { getTeachers, getTeacherSlots };
