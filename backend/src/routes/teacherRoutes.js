const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

const {
  generateSlots,
  getRegistrations,
  cancelRegistration,
  getSlots,
  updateSlotAvailability,
} = require('../controllers/teacherController');

router.post('/slots/generate', authMiddleware, generateSlots);
router.get('/slots', authMiddleware, getSlots);
router.patch('/slots/:id/availability', authMiddleware, updateSlotAvailability);
router.get('/registrations', authMiddleware, getRegistrations);
router.patch('/registrations/:id/cancel', authMiddleware, cancelRegistration);

module.exports = router;
