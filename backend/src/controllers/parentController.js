const supabase = require('../config/db');

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

  res.json(data);
};

module.exports = { getParentRegistrations };