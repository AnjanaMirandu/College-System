const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/db');
const {
  assertMailConfig,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} = require('../services/emailService');
const { assertValidEmailForDelivery } = require('../utils/emailValidation');

const createToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
const createPasswordResetToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30m' });
const allowedAdmin = {
  id: 1,
  name: 'Kristina Rimkuviene',
  email: 'kristina.rimkuviene@didzdvaris.lt',
  password_hash: '$2b$10$crSqZDiGS7ClHvBHq791/OC0.G4aEMXJXN1PbyjFCjbVIaKTqprFS',
};

const recordLoginEvent = async ({ userId, userType, email }) => {
  const { error } = await supabase.from('auth_logs').insert([{
    user_id: userId,
    user_type: userType,
    email,
    created_at: new Date().toISOString(),
  }]);

  if (error) {
    console.warn('Failed to record login event:', error.message);
  }
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

const isMissingParentChildColumns = (error) => (
  error?.message?.includes("Could not find the 'child_name' column")
  || error?.message?.includes("Could not find the 'child_class' column")
);

const getFrontendUrl = () => (
  process.env.FRONTEND_URL
  || process.env.CLIENT_URL
  || 'https://college-system-anjanamirandu.vercel.app'
).replace(/\/$/, '');

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizeLanguage = (language) => (String(language || '').toLowerCase().startsWith('lt') ? 'lt' : 'en');

const getResetTable = (accountType) => {
  if (accountType === 'teacher') return 'teachers';
  if (accountType === 'parent') return 'parents';
  return '';
};

const deleteNewAccount = async ({ table, id, accountType }) => {
  const { error } = await supabase.from(table).delete().eq('id', id);

  if (error) {
    console.error(`Failed to roll back ${accountType} account after email failure:`, error.message);
  }
};

const sendWelcomeEmailRequired = async ({ user, accountType, language }) => {
  try {
    await sendWelcomeEmail({
      to: user.email,
      name: user.name,
      accountType,
      language,
    });
  } catch (mailError) {
    console.error(`${accountType} welcome email failed:`, mailError.message);
    throw mailError;
  }
};

const loginTeacher = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const { password } = req.body;
  const { data: teacher, error } = await supabase
    .from('teachers')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error || !teacher) {
    const { data: parentWithEmail } = await supabase
      .from('parents')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (parentWithEmail) {
      return res.status(400).json({ message: 'This email belongs to a parent account. Please use Parent Login.' });
    }

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
  const { name, password, subject, room } = req.body;
  const email = normalizeEmail(req.body?.email);
  const language = normalizeLanguage(req.body?.language);

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  try {
    assertMailConfig();
  } catch (mailConfigError) {
    console.error('Teacher registration blocked because email is not configured:', mailConfigError.message);
    return res.status(503).json({
      message: 'Email sending is not configured. Please contact the school administrator before creating accounts.',
    });
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

  try {
    await sendWelcomeEmailRequired({ user: data, accountType: 'teacher', language });
  } catch {
    await deleteNewAccount({ table: 'teachers', id: data.id, accountType: 'teacher' });
    return res.status(502).json({
      message: 'Unable to send the welcome email. The account was not created. Please try again in a moment.',
    });
  }

  await recordLoginEvent({ userId: data.id, userType: 'teacher', email: data.email });
  res.json({ ...buildAuthResponse(data, 'teacher'), welcomeEmailSent: true });
};

const loginParent = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const { password } = req.body;
  const { data: parent, error } = await supabase
    .from('parents')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error || !parent) {
    const { data: teacherWithEmail } = await supabase
      .from('teachers')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (teacherWithEmail) {
      return res.status(400).json({ message: 'This email belongs to a teacher account. Please use Teacher Login.' });
    }

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
  const { name, password, childName, childClass } = req.body;
  const email = normalizeEmail(req.body?.email);
  const language = normalizeLanguage(req.body?.language);

  if (!name || !email || !password || !childName || !childClass) {
    return res.status(400).json({ message: 'Name, email, password, child name, and class are required' });
  }

  try {
    await assertValidEmailForDelivery(email);
  } catch (emailError) {
    return res.status(emailError.statusCode || 400).json({ message: emailError.message });
  }

  try {
    assertMailConfig();
  } catch (mailConfigError) {
    console.error('Parent registration blocked because email is not configured:', mailConfigError.message);
    return res.status(503).json({
      message: 'Email sending is not configured. Please contact the school administrator before creating accounts.',
    });
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
  const parentPayload = {
    name,
    email,
    password_hash,
    child_name: childName,
    child_class: childClass,
  };

  let { data, error } = await supabase
    .from('parents')
    .insert([parentPayload])
    .select()
    .single();

  if (isMissingParentChildColumns(error)) {
    const fallbackPayload = {
      name,
      email,
      password_hash,
    };

    const fallbackResult = await supabase
      .from('parents')
      .insert([fallbackPayload])
      .select()
      .single();

    data = fallbackResult.data
      ? {
        ...fallbackResult.data,
        child_name: childName,
        child_class: childClass,
      }
      : null;
    error = fallbackResult.error;
  }

  if (error || !data) {
    return res.status(500).json({ message: error?.message || 'Unable to create parent account' });
  }

  try {
    await sendWelcomeEmailRequired({ user: data, accountType: 'parent', language });
  } catch {
    await deleteNewAccount({ table: 'parents', id: data.id, accountType: 'parent' });
    return res.status(502).json({
      message: 'Unable to send the welcome email. The account was not created. Please try again in a moment.',
    });
  }

  await recordLoginEvent({ userId: data.id, userType: 'parent', email: data.email });
  res.json({ ...buildAuthResponse(data, 'parent'), welcomeEmailSent: true });
};

const loginAdmin = async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '').trim();

  if (email !== allowedAdmin.email) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const isMatch = await bcrypt.compare(password, allowedAdmin.password_hash);
  if (!isMatch) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  await recordLoginEvent({ userId: allowedAdmin.id, userType: 'admin', email: allowedAdmin.email });
  res.json(buildAuthResponse(allowedAdmin, 'admin'));
};

const requestPasswordReset = async (req, res) => {
  const accountType = String(req.body?.accountType || '').trim().toLowerCase();
  const email = normalizeEmail(req.body?.email);
  const language = normalizeLanguage(req.body?.language);
  const table = getResetTable(accountType);

  if (!table || !email) {
    return res.status(400).json({ message: 'Account type and email are required' });
  }

  try {
    await assertValidEmailForDelivery(email);
  } catch (emailError) {
    return res.status(emailError.statusCode || 400).json({ message: emailError.message });
  }

  const { data: user, error } = await supabase
    .from(table)
    .select('id, name, email')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ message: 'Unable to check this email address' });
  }

  if (user) {
    const token = createPasswordResetToken({
      id: user.id,
      email: user.email,
      type: accountType,
      purpose: 'password-reset',
    });
    const resetUrl = `${getFrontendUrl()}/reset-password?token=${encodeURIComponent(token)}`;

    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
        accountType,
        language,
      });
    } catch (mailError) {
      console.error('Password reset email failed:', mailError.message);
      return res.status(500).json({ message: 'Unable to send reset email. Please contact the school administrator.' });
    }
  }

  return res.json({
    message: 'If that email is registered, a password reset link has been sent.',
  });
};

const resetPassword = async (req, res) => {
  const token = String(req.body?.token || '').trim();
  const password = String(req.body?.password || '');

  if (!token || !password) {
    return res.status(400).json({ message: 'Reset token and new password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(400).json({ message: 'This reset link is invalid or has expired' });
  }

  if (payload?.purpose !== 'password-reset') {
    return res.status(400).json({ message: 'This reset link is invalid' });
  }

  const table = getResetTable(payload.type);
  if (!table || !payload.email || !payload.id) {
    return res.status(400).json({ message: 'This reset link is invalid' });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const { data, error } = await supabase
    .from(table)
    .update({ password_hash })
    .eq('id', payload.id)
    .eq('email', payload.email)
    .select('id')
    .maybeSingle();

  if (error || !data) {
    return res.status(400).json({ message: 'Unable to reset password for this account' });
  }

  return res.json({
    message: 'Password reset successfully',
    accountType: payload.type,
  });
};

module.exports = {
  loginTeacher,
  registerTeacher,
  loginParent,
  registerParent,
  loginAdmin,
  requestPasswordReset,
  resetPassword,
};
