const fs = require('fs/promises');
const path = require('path');
const supabase = require('../config/db');

const settingsPath = path.join(__dirname, '../../data/registrationSettings.json');
const settingsUserType = 'registration_settings';

const defaultSettings = {
  id: 1,
  is_open: false,
  opens_at: null,
  closes_at: null,
  updated_by: null,
  updated_at: new Date().toISOString(),
};

const ensureDataDir = async () => {
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
};

const readRegistrationSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('auth_logs')
      .select('user_id, email, created_at')
      .eq('user_type', settingsUserType)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data?.email) {
      return {
        ...defaultSettings,
        ...JSON.parse(data.email),
        id: 1,
        updated_by: data.user_id,
        updated_at: data.created_at,
      };
    }

    if (!error) {
      return defaultSettings;
    }
  } catch (error) {
    console.error('Unable to read persisted registration settings:', error.message);
  }

  try {
    const content = await fs.readFile(settingsPath, 'utf8');
    return { ...defaultSettings, ...JSON.parse(content) };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Unable to read local registration settings:', error.message);
    }
    return defaultSettings;
  }
};

const writeRegistrationSettings = async (settings) => {
  const nextSettings = {
    ...defaultSettings,
    ...settings,
    id: 1,
    updated_at: settings.updated_at || new Date().toISOString(),
  };

  const { error } = await supabase.from('auth_logs').insert([{
    user_id: nextSettings.updated_by || null,
    user_type: settingsUserType,
    email: JSON.stringify({
      id: 1,
      is_open: nextSettings.is_open,
      opens_at: nextSettings.opens_at,
      closes_at: nextSettings.closes_at,
    }),
    created_at: nextSettings.updated_at,
  }]);

  if (error) {
    console.error('Unable to persist registration settings:', error.message);
  }

  try {
    await ensureDataDir();
    await fs.writeFile(settingsPath, JSON.stringify(nextSettings, null, 2));
  } catch (error) {
    if (error.code !== 'EROFS') {
      console.error('Unable to write local registration settings:', error.message);
    }
  }

  return nextSettings;
};

module.exports = {
  readRegistrationSettings,
  writeRegistrationSettings,
};
