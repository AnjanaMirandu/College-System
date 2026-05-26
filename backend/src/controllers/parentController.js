const supabase = require('../config/db');

const compareRegistrationsBySlotTime = (left, right) => {
  const leftStart = left?.slots?.start_time || '';
  const rightStart = right?.slots?.start_time || '';

  if (leftStart !== rightStart) {
    return leftStart.localeCompare(rightStart);
  }

  const leftEnd = left?.slots?.end_time || '';
  const rightEnd = right?.slots?.end_time || '';

  if (leftEnd !== rightEnd) {
    return leftEnd.localeCompare(rightEnd);
  }

  return Number(left?.id || 0) - Number(right?.id || 0);
};

const getParentRegistrations = async (req, res) => {
  if (!req.user || req.user.type !== 'parent') {
    return res.status(403).json({ message: 'Parent access required' });
  }

  const { data, error } = await supabase
    .from('registrations')
    .select('*, slots(start_time, end_time, teacher_id)')
    .eq('parent_email', req.user.email);

  if (error) {
    return res.status(500).json({ message: 'Error fetching registrations' });
  }

  const teacherIds = [
    ...new Set((data || [])
      .map((registration) => registration.teacher_id || registration.slots?.teacher_id)
      .filter(Boolean)),
  ];

  let teachersById = new Map();
  if (teacherIds.length) {
    const { data: teachers, error: teacherError } = await supabase
      .from('teachers')
      .select('id, name')
      .in('id', teacherIds);

    if (teacherError) {
      return res.status(500).json({ message: 'Error fetching teachers for registrations' });
    }

    teachersById = new Map((teachers || []).map((teacher) => [teacher.id, teacher]));
  }

  const registrations = (data || []).map((registration) => {
    const teacherId = registration.teacher_id || registration.slots?.teacher_id;
    const teacher = teachersById.get(teacherId) || null;

    return {
      ...registration,
      teacher_id: teacher?.name || registration.teacher_id,
      teacher_numeric_id: registration.teacher_id,
      teacher_name: teacher?.name || null,
      teachers: teacher ? { name: teacher.name } : null,
    };
  });

  res.json(registrations.sort(compareRegistrationsBySlotTime));
};

module.exports = { getParentRegistrations };
