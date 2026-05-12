const express = require('express');
const router = express.Router();

const { getTeachers, getTeacherSlots } = require('../controllers/slotController');

router.get('/', getTeachers);
router.get('/:teacherId/slots', getTeacherSlots);

module.exports = router;