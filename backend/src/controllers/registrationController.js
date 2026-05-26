const supabase = require('../config/db');
const { readRegistrationSettings } = require('../services/registrationSettingsStore');
const { processUpcomingMeetingReminders } = require('../services/meetingReminderService');
const { assertValidEmailForDelivery } = require('../utils/emailValidation');

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

const createRegistration = async (req, res) => {
  const { slotIds, parentName, parentEmail, parentPhone, childName, childClass, note } = req.body;
  const requestedIds = Array.isArray(slotIds) ? slotIds : [slotIds];
  const normalizedParentEmail = String(parentEmail || '').trim().toLowerCase();
  const normalizedParentPhone = String(parentPhone || '').trim();

  const registrationSettings = await getRegistrationSettings();
  if (registrationSettings.error) {
    return res.status(500).json({ message: 'Unable to check registration period' });
  }
  if (!isRegistrationOpenNow(registrationSettings.settings)) {
    return res.status(403).json({ message: 'Registration is currently closed by the administrator.' });
  }

  if (!requestedIds.length || requestedIds.length > 2) {
    return res.status(400).json({ message: 'Please select one or two slots.' });
  }

  if (!normalizedParentEmail && !normalizedParentPhone) {
    return res.status(400).json({ message: 'Parent email or phone is required.' });
  }

  if (normalizedParentEmail) {
    try {
      await assertValidEmailForDelivery(normalizedParentEmail);
    } catch (emailError) {
      return res.status(emailError.statusCode || 400).json({ message: emailError.message });
    }
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
    parent_email: normalizedParentEmail || null,
    parent_phone: normalizedParentPhone || null,
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

  processUpcomingMeetingReminders().catch((reminderError) => {
    console.error('Meeting reminder check after booking failed:', reminderError.message);
  });

  res.json({ message: 'Successfully registered' });
};

module.exports = { createRegistration };
