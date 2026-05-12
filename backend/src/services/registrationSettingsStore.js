const fs = require('fs/promises');
const path = require('path');

const settingsPath = path.join(__dirname, '../../data/registrationSettings.json');

const defaultSettings = {
  id: 1,
  is_open: true,
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

  await ensureDataDir();
  await fs.writeFile(settingsPath, JSON.stringify(nextSettings, null, 2));
  return nextSettings;
};

module.exports = {
  readRegistrationSettings,
  writeRegistrationSettings,
};
