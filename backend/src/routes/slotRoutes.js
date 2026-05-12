const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const requireUserType = require('../middleware/requireUserType');

const { getTeachers, getTeacherSlots } = require('../controllers/slotController');

router.use(authMiddleware, requireUserType('parent'));

router.get('/', getTeachers);
router.get('/:teacherId/slots', getTeacherSlots);

module.exports = router;
