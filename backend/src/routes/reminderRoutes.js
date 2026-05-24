const express = require('express');
const { processUpcomingMeetingReminders } = require('../services/meetingReminderService');

const router = express.Router();

const hasValidCronSecret = (req) => {
  if (!process.env.CRON_SECRET) {
    return true;
  }

  const authorization = req.get('authorization') || '';
  return authorization === `Bearer ${process.env.CRON_SECRET}`;
};

router.get('/reminders/run', async (req, res) => {
  if (!hasValidCronSecret(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const result = await processUpcomingMeetingReminders();
    return res.json({ message: 'Meeting reminders processed', ...result });
  } catch (error) {
    console.error('Manual meeting reminder run failed:', error.message);
    return res.status(500).json({ message: 'Unable to process meeting reminders' });
  }
});

module.exports = router;
