const supabase = require('../config/db');
const bcrypt = require('bcryptjs');
const {
  readRegistrationSettings,
  writeRegistrationSettings,
} = require('../services/registrationSettingsStore');

const normalizeTeacherPayload = (teacher) => ({
  name: String(teacher.name || '').trim(),
  email: String(teacher.email || '').trim().toLowerCase(),
  subject: String(teacher.subject || '').trim(),
  room: String(teacher.room || '').trim(),
  password: String(teacher.password || '').trim(),
});

const meetingWindow = {
  start: '12:00',
  end: '19:00',
  maxSlots: 42,
};

const formatLocalDateTime = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const normalizeRegistrationSettings = (settings) => {
  const now = new Date();
  const opensAt = settings?.opens_at ? new Date(settings.opens_at) : null;
  const closesAt = settings?.closes_at ? new Date(settings.closes_at) : null;
  const withinDates = (!opensAt || opensAt <= now) && (!closesAt || closesAt >= now);
  return {
    id: settings?.id || 1,
    is_open: Boolean(settings?.is_open),
    opens_at: settings?.opens_at || '',
    closes_at: settings?.closes_at || '',
    is_active_now: Boolean(settings?.is_open && withinDates),
    updated_at: settings?.updated_at || '',
    schema_missing: Boolean(settings?.schema_missing),
  };
};

const isMissingRegistrationSettingsTable = (error) => (
  error?.message?.includes("Could not find the table 'public.registration_settings'")
  || error?.message?.includes('relation "public.registration_settings" does not exist')
);

const getRegistrationSettingsRecord = async () => {
  const { data, error } = await supabase
    .from('registration_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    if (isMissingRegistrationSettingsTable(error)) {
      return { data: await readRegistrationSettings(), error: null };
    }

    return { data: null, error };
  }

  if (data) {
    return { data, error: null };
  }

  const { data: created, error: createError } = await supabase
    .from('registration_settings')
    .insert([{ id: 1, is_open: false }])
    .select('*')
    .single();

  return { data: created, error: createError };
};

const recordAdminAction = async ({ req, action, targetType, targetId = null, details = {} }) => {
  const payload = {
    admin_id: req.user?.id || null,
    admin_email: req.user?.email || 'unknown',
    action,
    target_type: targetType,
    target_id: targetId ? String(targetId) : null,
    details,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('admin_audit_logs').insert([payload]);
  if (error) {
    console.error('Failed to record admin audit log:', error.message);
  }
};

const requireAdmin = (req, res) => {
  if (!req.user || req.user.type !== 'admin') {
    res.status(403).json({ message: 'Admin access required' });
    return false;
  }

  return true;
};

const getDashboard = async (req, res) => {
  if (!requireAdmin(req, res)) {
    return;
  }

  const [
    { count: teacherCount, error: teacherCountError },
    { count: parentCount, error: parentCountError },
    { count: slotCount, error: slotCountError },
    { count: registrationCount, error: registrationCountError },
    { data: teachers, error: teachersError },
    { data: parents, error: parentsError },
    { data: slots, error: slotsError },
    { data: registrations, error: registrationsError },
    { data: registrationSettings, error: registrationSettingsError },
  ] = await Promise.all([
    supabase.from('teachers').select('*', { count: 'exact', head: true }),
    supabase.from('parents').select('*', { count: 'exact', head: true }),
    supabase.from('slots').select('*', { count: 'exact', head: true }),
    supabase.from('registrations').select('*', { count: 'exact', head: true }),
    supabase.from('teachers').select('id, name, subject, room, email, created_at').order('created_at', { ascending: false }),
    supabase.from('parents').select('id, name, email, created_at').order('created_at', { ascending: false }),
    supabase.from('slots').select('id, teacher_id, start_time, end_time, is_booked, teachers(name, subject)').order('start_time', { ascending: false }),
    supabase.from('registrations').select('id, teacher_id, slot_id, parent_name, parent_email, parent_phone, child_name, child_class, note, status, cancel_reason, created_at, teachers(name), slots(start_time, end_time)').order('created_at', { ascending: false }),
    getRegistrationSettingsRecord(),
  ]);

  const errors = [
    teacherCountError,
    parentCountError,
    slotCountError,
    registrationCountError,
    teachersError,
    parentsError,
    slotsError,
    registrationsError,
    registrationSettingsError,
  ].filter(Boolean);

  if (errors.length > 0) {
    return res.status(500).json({ message: errors[0].message || 'Error loading admin dashboard' });
  }

  await recordAdminAction({
    req,
    action: 'view_dashboard',
    targetType: 'dashboard',
    details: {
      teacher_count: teacherCount || 0,
      parent_count: parentCount || 0,
      slot_count: slotCount || 0,
      registration_count: registrationCount || 0,
    },
  });

  res.json({
    summary: {
      teachers: teacherCount || 0,
      parents: parentCount || 0,
      slots: slotCount || 0,
      registrations: registrationCount || 0,
    },
    teachers: teachers || [],
    parents: parents || [],
    slots: slots || [],
    registrations: registrations || [],
    registrationSettings: normalizeRegistrationSettings(registrationSettings),
  });
};

const updateRegistrationSettings = async (req, res) => {
  if (!requireAdmin(req, res)) {
    return;
  }

  const { isOpen, opensAt, closesAt } = req.body;
  const payload = {
    id: 1,
    is_open: Boolean(isOpen),
    opens_at: opensAt || null,
    closes_at: closesAt || null,
    updated_by: req.user.id,
    updated_at: new Date().toISOString(),
  };

  if (payload.opens_at && payload.closes_at && new Date(payload.opens_at) >= new Date(payload.closes_at)) {
    return res.status(400).json({ message: 'Registration opening time must be before the closing time' });
  }

  const { data, error } = await supabase
    .from('registration_settings')
    .upsert(payload)
    .select('*')
    .single();

  if (error || !data) {
    if (isMissingRegistrationSettingsTable(error)) {
      const savedSettings = await writeRegistrationSettings(payload);
      await recordAdminAction({
        req,
        action: 'update_registration_settings_local',
        targetType: 'registration_settings',
        targetId: 1,
        details: normalizeRegistrationSettings(savedSettings),
      });

      return res.json({
        message: 'Registration settings updated',
        registrationSettings: normalizeRegistrationSettings(savedSettings),
      });
    }

    return res.status(500).json({ message: error?.message || 'Unable to update registration settings' });
  }

  await recordAdminAction({
    req,
    action: 'update_registration_settings',
    targetType: 'registration_settings',
    targetId: 1,
    details: normalizeRegistrationSettings(data),
  });

  res.json({
    message: 'Registration settings updated',
    registrationSettings: normalizeRegistrationSettings(data),
  });
};

const generateAdminSlots = async (req, res) => {
  if (!requireAdmin(req, res)) {
    return;
  }

  const { teacherId, date, startTime, endTime } = req.body;
  const numericTeacherId = Number(teacherId);
  const minutes = 10;

  if (!numericTeacherId || Number.isNaN(numericTeacherId) || !date || !startTime || !endTime) {
    return res.status(400).json({ message: 'Teacher, date, start time, and end time are required' });
  }

  const timeRegex = /^\d{2}:\d{2}$/;
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    return res.status(400).json({ message: 'Start time and end time must be in HH:MM format' });
  }

  const start = new Date(`${date}T${startTime}:00`);
  const end = new Date(`${date}T${endTime}:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    return res.status(400).json({ message: 'End time must be after start time' });
  }
  if (startTime < meetingWindow.start || endTime > meetingWindow.end) {
    return res.status(400).json({ message: 'Meetings can only be created between 12:00 and 19:00' });
  }

  const totalMinutes = (end.getTime() - start.getTime()) / 60000;
  const slotCount = Math.floor(totalMinutes / minutes);
  if (slotCount <= 0) {
    return res.status(400).json({ message: 'The selected time range is too short for the chosen duration' });
  }
  if (slotCount > meetingWindow.maxSlots) {
    return res.status(400).json({ message: `A maximum of ${meetingWindow.maxSlots} slots can be created at once` });
  }

  const { data: teacher, error: teacherError } = await supabase
    .from('teachers')
    .select('id, name')
    .eq('id', numericTeacherId)
    .maybeSingle();

  if (teacherError || !teacher) {
    return res.status(404).json({ message: 'Teacher not found' });
  }

  const slots = Array.from({ length: slotCount }).map((_, index) => {
    const slotStart = new Date(start.getTime() + index * minutes * 60000);
    const slotEnd = new Date(slotStart.getTime() + minutes * 60000);
    return {
      teacher_id: numericTeacherId,
      start_time: formatLocalDateTime(slotStart),
      end_time: formatLocalDateTime(slotEnd),
    };
  });

  const { data, error } = await supabase
    .from('slots')
    .upsert(slots, { onConflict: 'teacher_id,start_time,end_time', ignoreDuplicates: true })
    .select('id, teacher_id, start_time, end_time, is_booked');

  if (error) {
    return res.status(500).json({ message: error.message || 'Unable to create slots' });
  }

  await recordAdminAction({
    req,
    action: 'generate_slots',
    targetType: 'slot_batch',
    details: {
      teacher_id: numericTeacherId,
      teacher_name: teacher.name,
      date,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: 10,
      created_count: data?.length || 0,
    },
  });

  res.json({
    message: `Created ${data?.length || 0} slot(s)`,
    created: data?.length || 0,
    slots: data || [],
  });
};

const createTeacher = async (req, res) => {
  if (!requireAdmin(req, res)) {
    return;
  }

  const teacher = normalizeTeacherPayload(req.body);

  if (!teacher.name || !teacher.email || !teacher.subject || !teacher.room || !teacher.password) {
    return res.status(400).json({ message: 'Name, email, subject, room, and password are required' });
  }

  const { data: existingTeacher, error: existingError } = await supabase
    .from('teachers')
    .select('id')
    .eq('email', teacher.email)
    .maybeSingle();

  if (existingError) {
    return res.status(500).json({ message: 'Unable to check teacher email' });
  }

  if (existingTeacher) {
    return res.status(400).json({ message: `Teacher with email ${teacher.email} already exists` });
  }

  const password_hash = await bcrypt.hash(teacher.password, 10);
  const { data, error } = await supabase
    .from('teachers')
    .insert([{
      name: teacher.name,
      email: teacher.email,
      subject: teacher.subject,
      room: teacher.room,
      password_hash,
    }])
    .select('id, name, email, subject, room')
    .single();

  if (error || !data) {
    return res.status(500).json({ message: error?.message || 'Unable to create teacher' });
  }

  await recordAdminAction({
    req,
    action: 'create_teacher',
    targetType: 'teacher',
    targetId: data.id,
    details: {
      name: data.name,
      email: data.email,
      subject: data.subject,
      room: data.room,
    },
  });

  res.json({ message: 'Teacher created', teacher: data });
};

const importTeachers = async (req, res) => {
  if (!requireAdmin(req, res)) {
    return;
  }

  const incomingTeachers = Array.isArray(req.body?.teachers) ? req.body.teachers : [];
  if (!incomingTeachers.length) {
    return res.status(400).json({ message: 'No teachers provided for import' });
  }

  const normalizedTeachers = incomingTeachers.map(normalizeTeacherPayload);
  const invalidTeacher = normalizedTeachers.find((teacher) => (
    !teacher.name || !teacher.email || !teacher.subject || !teacher.room || !teacher.password
  ));

  if (invalidTeacher) {
    return res.status(400).json({ message: 'Every imported teacher needs name, email, subject, room, and password' });
  }

  const emails = normalizedTeachers.map((teacher) => teacher.email);
  const { data: existingTeachers, error: existingError } = await supabase
    .from('teachers')
    .select('email')
    .in('email', emails);

  if (existingError) {
    return res.status(500).json({ message: 'Unable to check existing teachers' });
  }

  const existingEmailSet = new Set((existingTeachers || []).map((teacher) => teacher.email));
  const duplicateInPayload = emails.find((email, index) => emails.indexOf(email) !== index);
  if (duplicateInPayload) {
    return res.status(400).json({ message: `Duplicate teacher email in import: ${duplicateInPayload}` });
  }

  const skipped = normalizedTeachers.filter((teacher) => existingEmailSet.has(teacher.email)).map((teacher) => teacher.email);
  const teachersToCreate = normalizedTeachers.filter((teacher) => !existingEmailSet.has(teacher.email));

  if (!teachersToCreate.length) {
    return res.status(400).json({ message: 'All imported teachers already exist', skipped });
  }

  const insertRows = await Promise.all(teachersToCreate.map(async (teacher) => ({
    name: teacher.name,
    email: teacher.email,
    subject: teacher.subject,
    room: teacher.room,
    password_hash: await bcrypt.hash(teacher.password, 10),
  })));

  const { data, error } = await supabase
    .from('teachers')
    .insert(insertRows)
    .select('id, name, email, subject, room');

  if (error) {
    return res.status(500).json({ message: error.message || 'Unable to import teachers' });
  }

  await recordAdminAction({
    req,
    action: 'import_teachers',
    targetType: 'teacher_batch',
    details: {
      created_count: data?.length || 0,
      skipped,
      teachers: (data || []).map((teacher) => ({
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        subject: teacher.subject,
        room: teacher.room,
      })),
    },
  });

  res.json({
    message: 'Teachers imported successfully',
    created: data?.length || 0,
    skipped,
    teachers: data || [],
  });
};

const deleteTeacher = async (req, res) => {
  if (!requireAdmin(req, res)) {
    return;
  }

  const { id } = req.params;
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, name, email, subject, room')
    .eq('id', id)
    .maybeSingle();
  const { error } = await supabase.from('teachers').delete().eq('id', id);

  if (error) {
    return res.status(500).json({ message: 'Unable to delete teacher' });
  }

  await recordAdminAction({
    req,
    action: 'delete_teacher',
    targetType: 'teacher',
    targetId: id,
    details: teacher || {},
  });

  res.json({ message: 'Teacher deleted' });
};

const deleteTeachers = async (req, res) => {
  if (!requireAdmin(req, res)) {
    return;
  }

  const teacherIds = Array.isArray(req.body?.teacherIds)
    ? req.body.teacherIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
    : [];

  const uniqueTeacherIds = [...new Set(teacherIds)];
  if (!uniqueTeacherIds.length) {
    return res.status(400).json({ message: 'Select at least one teacher to delete' });
  }

  const { data: teachers } = await supabase
    .from('teachers')
    .select('id, name, email, subject, room')
    .in('id', uniqueTeacherIds);

  const { error } = await supabase
    .from('teachers')
    .delete()
    .in('id', uniqueTeacherIds);

  if (error) {
    return res.status(500).json({ message: 'Unable to delete selected teachers' });
  }

  await recordAdminAction({
    req,
    action: 'delete_teachers',
    targetType: 'teacher_batch',
    details: {
      requested_ids: uniqueTeacherIds,
      deleted_count: teachers?.length || 0,
      teachers: teachers || [],
    },
  });

  res.json({
    message: `Deleted ${teachers?.length || uniqueTeacherIds.length} teacher(s)`,
    deleted: teachers?.length || uniqueTeacherIds.length,
  });
};

const deleteParent = async (req, res) => {
  if (!requireAdmin(req, res)) {
    return;
  }

  const { id } = req.params;
  const { data: parent } = await supabase
    .from('parents')
    .select('id, name, email')
    .eq('id', id)
    .maybeSingle();
  const { error } = await supabase.from('parents').delete().eq('id', id);

  if (error) {
    return res.status(500).json({ message: 'Unable to delete parent' });
  }

  await recordAdminAction({
    req,
    action: 'delete_parent',
    targetType: 'parent',
    targetId: id,
    details: parent || {},
  });

  res.json({ message: 'Parent deleted' });
};

const deleteParents = async (req, res) => {
  if (!requireAdmin(req, res)) {
    return;
  }

  const parentIds = Array.isArray(req.body?.parentIds)
    ? req.body.parentIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
    : [];

  const uniqueParentIds = [...new Set(parentIds)];
  if (!uniqueParentIds.length) {
    return res.status(400).json({ message: 'Select at least one parent to delete' });
  }

  const { data: parents } = await supabase
    .from('parents')
    .select('id, name, email')
    .in('id', uniqueParentIds);

  const parentEmails = (parents || []).map((parent) => parent.email).filter(Boolean);
  if (parentEmails.length) {
    const { error: registrationError } = await supabase
      .from('registrations')
      .delete()
      .in('parent_email', parentEmails);

    if (registrationError) {
      return res.status(500).json({ message: 'Unable to remove selected parent registrations' });
    }
  }

  const { error } = await supabase
    .from('parents')
    .delete()
    .in('id', uniqueParentIds);

  if (error) {
    return res.status(500).json({ message: 'Unable to delete selected parents' });
  }

  await recordAdminAction({
    req,
    action: 'delete_parents',
    targetType: 'parent_batch',
    details: {
      requested_ids: uniqueParentIds,
      deleted_count: parents?.length || 0,
      parents: parents || [],
    },
  });

  res.json({
    message: `Deleted ${parents?.length || uniqueParentIds.length} parent(s)`,
    deleted: parents?.length || uniqueParentIds.length,
  });
};

const deleteSlot = async (req, res) => {
  if (!requireAdmin(req, res)) {
    return;
  }

  const { id } = req.params;
  const { data: slot } = await supabase
    .from('slots')
    .select('id, teacher_id, start_time, end_time, is_booked')
    .eq('id', id)
    .maybeSingle();
  const { error: registrationError } = await supabase.from('registrations').delete().eq('slot_id', id);

  if (registrationError) {
    return res.status(500).json({ message: 'Unable to remove slot registrations' });
  }

  const { error } = await supabase.from('slots').delete().eq('id', id);

  if (error) {
    return res.status(500).json({ message: 'Unable to delete slot' });
  }

  await recordAdminAction({
    req,
    action: 'delete_slot',
    targetType: 'slot',
    targetId: id,
    details: slot || {},
  });

  res.json({ message: 'Slot deleted' });
};

const deleteSlots = async (req, res) => {
  if (!requireAdmin(req, res)) {
    return;
  }

  const slotIds = Array.isArray(req.body?.slotIds)
    ? req.body.slotIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
    : [];

  const uniqueSlotIds = [...new Set(slotIds)];
  if (!uniqueSlotIds.length) {
    return res.status(400).json({ message: 'Select at least one slot to delete' });
  }

  const { data: slots } = await supabase
    .from('slots')
    .select('id, teacher_id, start_time, end_time, is_booked')
    .in('id', uniqueSlotIds);

  const { error: registrationError } = await supabase
    .from('registrations')
    .delete()
    .in('slot_id', uniqueSlotIds);

  if (registrationError) {
    return res.status(500).json({ message: 'Unable to remove selected slot registrations' });
  }

  const { error } = await supabase
    .from('slots')
    .delete()
    .in('id', uniqueSlotIds);

  if (error) {
    return res.status(500).json({ message: 'Unable to delete selected slots' });
  }

  await recordAdminAction({
    req,
    action: 'delete_slots',
    targetType: 'slot_batch',
    details: {
      requested_ids: uniqueSlotIds,
      deleted_count: slots?.length || 0,
      slots: slots || [],
    },
  });

  res.json({
    message: `Deleted ${slots?.length || uniqueSlotIds.length} slot(s)`,
    deleted: slots?.length || uniqueSlotIds.length,
  });
};

const cancelRegistration = async (req, res) => {
  if (!requireAdmin(req, res)) {
    return;
  }

  const { id } = req.params;
  const { data, error } = await supabase
    .from('registrations')
    .update({ status: 'cancelled', cancel_reason: 'Cancelled by admin' })
    .eq('id', id)
    .select('slot_id')
    .maybeSingle();

  if (error || !data) {
    return res.status(404).json({ message: 'Registration not found' });
  }

  await supabase.from('slots').update({ is_booked: false }).eq('id', data.slot_id);

  await recordAdminAction({
    req,
    action: 'cancel_registration',
    targetType: 'registration',
    targetId: id,
    details: {
      slot_id: data.slot_id,
      reason: 'Cancelled by admin',
    },
  });

  res.json({ message: 'Registration cancelled' });
};

module.exports = {
  getDashboard,
  updateRegistrationSettings,
  createTeacher,
  importTeachers,
  generateAdminSlots,
  deleteTeacher,
  deleteTeachers,
  deleteParent,
  deleteParents,
  deleteSlot,
  deleteSlots,
  cancelRegistration,
};
