const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/db');

const createToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
const fallbackAdmins = [
  {
    id: 1,
    name: process.env.ADMIN_NAME || 'Test Admin',
    email: process.env.ADMIN_EMAIL || 'testadmin1@gmail.com',
    password_hash: process.env.ADMIN_PASSWORD_HASH || '$2b$10$6fH8MhrotfUgmhxoo2DTTuW8rKz4.8vW.OACYTvjNKmCxfJom1Lw6',
  },
  {
    id: 2,
    name: 'Test Admin',
    email: 'test.admin@college.test',
    password_hash: '$2b$10$7e8UKKRz4ZD6ionXfbw8/ewr7yS8ZYf14h3w33xv.ZnA/3BDlBwgK',
  },
];

const recordLoginEvent = async ({ userId, userType, email }) => {
  await supabase.from('auth_logs').insert([{
    user_id: userId,
    user_type: userType,
    email,
    created_at: new Date().toISOString(),
  }]);
};

const buildAuthResponse = (user, type) => {
  const token = createToken({ id: user.id, name: user.name, type, email: user.email });
  const profile = { id: user.id, name: user.name, email: user.email };

  if (type === 'parent') {
    profile.child_name = user.child_name || '';
    profile.child_class = user.child_class || '';
  }

  return {
    token,
    [type]: profile,
  };
};

const loginTeacher = async (req, res) => {
  const { email, password } = req.body;
  const { data: teacher, error } = await supabase
    .from('teachers')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error || !teacher) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const isMatch = await bcrypt.compare(password, teacher.password_hash);
  if (!isMatch) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  await recordLoginEvent({ userId: teacher.id, userType: 'teacher', email: teacher.email });
  res.json(buildAuthResponse(teacher, 'teacher'));
};

const registerTeacher = async (req, res) => {
  const { name, email, password, subject, room } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  const { data: existingTeacher, error: existingError } = await supabase
    .from('teachers')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingError) {
    return res.status(500).json({ message: 'Error checking existing teacher', details: existingError.message });
  }

  if (existingTeacher) {
    return res.status(400).json({ message: 'Email is already registered' });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const { data, error } = await supabase
    .from('teachers')
    .insert([{ name, email, password_hash, subject, room }])
    .select()
    .single();

  if (error || !data) {
    return res.status(500).json({ message: error?.message || 'Unable to create teacher account' });
  }

  await recordLoginEvent({ userId: data.id, userType: 'teacher', email: data.email });
  res.json(buildAuthResponse(data, 'teacher'));
};

const loginParent = async (req, res) => {
  const { email, password } = req.body;
  const { data: parent, error } = await supabase
    .from('parents')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error || !parent) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const isMatch = await bcrypt.compare(password, parent.password_hash);
  if (!isMatch) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  await recordLoginEvent({ userId: parent.id, userType: 'parent', email: parent.email });
  res.json(buildAuthResponse(parent, 'parent'));
};

const registerParent = async (req, res) => {
  const { name, email, password, childName, childClass } = req.body;

  if (!name || !email || !password || !childName || !childClass) {
    return res.status(400).json({ message: 'Name, email, password, child name, and class are required' });
  }

  const { data: existingParent, error: existingError } = await supabase
    .from('parents')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingError) {
    return res.status(500).json({ message: 'Error checking existing parent', details: existingError.message });
  }

  if (existingParent) {
    return res.status(400).json({ message: 'Email is already registered' });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const { data, error } = await supabase
    .from('parents')
    .insert([{
      name,
      email,
      password_hash,
      child_name: childName,
      child_class: childClass,
    }])
    .select()
    .single();

  if (error || !data) {
    return res.status(500).json({ message: error?.message || 'Unable to create parent account' });
  }

  await recordLoginEvent({ userId: data.id, userType: 'parent', email: data.email });
  res.json(buildAuthResponse(data, 'parent'));
};

const loginAdmin = async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '').trim();
  const { data: admin, error } = await supabase
    .from('admins')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  const fallbackAdmin = fallbackAdmins.find((item) => item.email.toLowerCase() === String(email || '').toLowerCase()) || null;
  const activeAdmin = error?.message?.includes("Could not find the table 'public.admins'")
    ? fallbackAdmin
    : (admin || fallbackAdmin);

  if (error && !error.message?.includes("Could not find the table 'public.admins'")) {
    return res.status(500).json({ message: 'Unable to load admin account' });
  }

  if (!activeAdmin) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const isMatch = await bcrypt.compare(password, activeAdmin.password_hash);
  if (!isMatch) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  await recordLoginEvent({ userId: activeAdmin.id, userType: 'admin', email: activeAdmin.email });
  res.json(buildAuthResponse(activeAdmin, 'admin'));
};

module.exports = { loginTeacher, registerTeacher, loginParent, registerParent, loginAdmin };
