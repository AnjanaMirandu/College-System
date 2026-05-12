const supabase = require('../config/db');

const meetingWindow = {
  start: '12:00',
  end: '19:00',
  maxSlots: 42,
};

const generateSlots = async (req, res) => {
  if (!req.user || req.user.type !== 'teacher') {
    return res.status(403).json({ message: 'Teacher access required' });
  }

  const { date, startTime, endTime } = req.body;
  const teacherId = Number(req.user.id);

  if (!date || !startTime || !endTime) {
    return res.status(400).json({ message: 'Date, start time, and end time are required.' });
  }
  if (!teacherId || Number.isNaN(teacherId)) {
    return res.status(400).json({ message: 'Invalid teacher ID.' });
  }

  const timeRegex = /^\d{2}:\d{2}$/;
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    return res.status(400).json({ message: 'Start time and end time must be in HH:MM format.' });
  }

  const start = new Date(`${date}T${startTime}:00`);
  const end = new Date(`${date}T${endTime}:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return res.status(400).json({ message: 'Invalid date or time format.' });
  }

  const minutes = 10;
  if (start >= end) {
    return res.status(400).json({ message: 'End time must be after start time.' });
  }
  if (startTime < meetingWindow.start || endTime > meetingWindow.end) {
    return res.status(400).json({ message: 'Meetings can only be created between 12:00 and 19:00.' });
  }

  const totalMinutes = (end.getTime() - start.getTime()) / 60000;
  const slotCount = Math.floor(totalMinutes / minutes);

  if (slotCount <= 0) {
    return res.status(400).json({ message: 'The selected time range is too short for the chosen duration.' });
  }
  if (slotCount > meetingWindow.maxSlots) {
    return res.status(400).json({ message: `Maximum ${meetingWindow.maxSlots} slots are allowed. Reduce the time range or increase the duration.` });
  }

  const slots = Array.from({ length: slotCount }).map((_, index) => {
    const slotStart = new Date(start.getTime() + index * minutes * 60000);
    const slotEnd = new Date(slotStart.getTime() + minutes * 60000);
    
    // Format as local datetime string (YYYY-MM-DD HH:MM:SS) for TIMESTAMP field
    const formatLocalDateTime = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const mins = String(date.getMinutes()).padStart(2, '0');
      const secs = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
    };
    
    return {
      teacher_id: teacherId,
      start_time: formatLocalDateTime(slotStart),
      end_time: formatLocalDateTime(slotEnd),
    };
  });

  const { error } = await supabase
    .from('slots')
    .insert(slots);

  if (error) {
    return res.status(500).json({ message: 'Error generating slots' });
  }

  res.json({ message: 'Slots generated successfully' });
};

const getRegistrations = async (req, res) => {
  if (!req.user || req.user.type !== 'teacher') {
    return res.status(403).json({ message: 'Teacher access required' });
  }

  const teacherId = Number(req.user.id);

  if (!teacherId || Number.isNaN(teacherId)) {
    return res.status(400).json({ message: 'Invalid teacher ID.' });
  }

  const { data, error } = await supabase
    .from('registrations')
    .select('*, slots(start_time, end_time)')
    .eq('teacher_id', teacherId);

  if (error) {
    return res.status(500).json({ message: 'Error fetching registrations' });
  }

  res.json(data);
};

const cancelRegistration = async (req, res) => {
  if (!req.user || req.user.type !== 'teacher') {
    return res.status(403).json({ message: 'Teacher access required' });
  }

  const { id } = req.params;
  const { reason } = req.body;
  const teacherId = req.user.id;

  const { data, error } = await supabase
    .from('registrations')
    .update({ status: 'cancelled', cancel_reason: reason })
    .eq('id', id)
    .eq('teacher_id', teacherId)
    .select();

  if (error || !data || data.length === 0) {
    return res.status(404).json({ message: 'Registration not found' });
  }

  await supabase
    .from('slots')
    .update({ is_booked: false })
    .eq('id', data[0].slot_id);

  res.json({ message: 'Registration cancelled' });
};

const getSlots = async (req, res) => {
  if (!req.user || req.user.type !== 'teacher') {
    return res.status(403).json({ message: 'Teacher access required' });
  }

  const teacherId = Number(req.user.id);

  if (!teacherId || Number.isNaN(teacherId)) {
    return res.status(400).json({ message: 'Invalid teacher ID.' });
  }

  const { data, error } = await supabase
    .from('slots')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('start_time', { ascending: true });

  if (error) {
    return res.status(500).json({ message: 'Error fetching slots' });
  }

  res.json(data);
};

module.exports = { generateSlots, getRegistrations, cancelRegistration, getSlots };
