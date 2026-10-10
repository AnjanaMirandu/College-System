const express = require('express');
const cors = require('cors');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  'https://registracija.didzdvaris.lt',
  'http://localhost:3000',
  'https://college-system-anjanamirandu.vercel.app',
  'https://frontend-ex19w842f-anjanamirandus-projects.vercel.app',
]
  .filter(Boolean)
  .flatMap((value) => String(value).split(','))
  .map((origin) => origin.trim())
  .map((origin) => origin.replace(/\/$/, ''))
  .filter(Boolean);

const isAllowedVercelFrontend = (origin = '') => (
  /^https:\/\/frontend-[a-z0-9-]+-anjanamirandus-projects\.vercel\.app$/i.test(origin)
  || /^https:\/\/frontend-[a-z0-9-]+\.vercel\.app$/i.test(origin)
  || origin === 'https://registracija.didzdvaris.lt'
  || origin === 'https://college-system-anjanamirandu.vercel.app'
  || origin === 'https://frontend-ex19w842f-anjanamirandus-projects.vercel.app'
  || origin === 'https://frontend-git-main-anjanamirandus-projects.vercel.app'
  || origin === 'https://frontend-kvfnzbeho-anjanamirandus-projects.vercel.app'
);

app.use(cors({
  origin(origin, callback) {
    const normalizedOrigin = String(origin || '').replace(/\/$/, '');

    if (!origin || allowedOrigins.includes(normalizedOrigin) || isAllowedVercelFrontend(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
}));
app.use(express.json());

const authRoutes = require('./routes/authRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const slotRoutes = require('./routes/slotRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const parentRoutes = require('./routes/parentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const { startMeetingReminderScheduler } = require('./services/meetingReminderService');

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const mountApiRoutes = (basePath) => {
  app.use(`${basePath}/auth`, authRoutes);
  app.use(`${basePath}/teacher`, teacherRoutes);
  app.use(`${basePath}/teachers`, slotRoutes); // for /teachers/:id/slots
  app.use(basePath || '/', registrationRoutes); // for /registrations
  app.use(`${basePath}/parent`, parentRoutes);
  app.use(`${basePath}/admin`, adminRoutes);
  app.use(basePath || '/', reminderRoutes);
};

mountApiRoutes('/api');
mountApiRoutes('');

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startMeetingReminderScheduler();
  });
}

module.exports = app;
