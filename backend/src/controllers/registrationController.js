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

const createRegistration = async (req, res) => {
  const { slotIds, parentName, parentEmail, parentPhone, childName, childClass, note } = req.body;
  const requestedIds = Array.isArray(slotIds) ? slotIds : [slotIds];

  const registrationSettings = await getActiveRegistrationSettings();
  if (registrationSettings.error) {
    return res.status(500).json({ message: 'Unable to check registration period' });
  }
  if (!registrationSettings.isActive) {
    return res.status(403).json({ message: 'Registration is currently closed by the administrator.' });
  }

  if (!requestedIds.length || requestedIds.length > 2) {
    return res.status(400).json({ message: 'Please select one or two slots.' });
  }

  const { data: slots, error: slotError } = await supabase
    .from('slots')
    .select('*')
    .in('id', requestedIds);

  if (slotError || !slots || slots.length !== requestedIds.length) {
    return res.status(400).json({ message: 'One or more selected slots are invalid.' });
  }

  const now = new Date();
  const unavailable = slots.find(slot => slot.is_booked || new Date(slot.start_time) <= now);
  if (unavailable) {
    return res.status(400).json({ message: 'One or more selected slots are not available.' });
  }

  const registrations = slots.map(slot => ({
    slot_id: slot.id,
    teacher_id: slot.teacher_id,
    parent_name: parentName,
    parent_email: parentEmail,
    parent_phone: parentPhone,
    child_name: childName,
    child_class: childClass,
    note,
  }));

  const { error } = await supabase
    .from('registrations')
    .insert(registrations);

  if (error) {
    return res.status(500).json({ message: 'Error creating registration' });
  }

  const { error: slotUpdateError } = await supabase
    .from('slots')
    .update({ is_booked: true })
    .in('id', requestedIds);

  if (slotUpdateError) {
    return res.status(500).json({ message: 'Error updating booked slots' });
  }

  res.json({ message: 'Successfully registered' });
};

module.exports = { createRegistration };
