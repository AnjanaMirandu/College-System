const express = require('express');
const router = express.Router();

const {
  loginTeacher,
  registerTeacher,
  loginParent,
  registerParent,
  loginAdmin,
  requestPasswordReset,
  resetPassword,
} = require('../controllers/authController');

router.post('/login', loginTeacher);
router.post('/teacher/login', loginTeacher);
router.post('/teacher/register', registerTeacher);
router.post('/parent/login', loginParent);
router.post('/parent/register', registerParent);
router.post('/admin/login', loginAdmin);
router.post('/password/forgot', requestPasswordReset);
router.post('/password/reset', resetPassword);

module.exports = router;
