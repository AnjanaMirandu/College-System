const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const requireUserType = require('../middleware/requireUserType');

const { createRegistration } = require('../controllers/registrationController');

router.post('/registrations', authMiddleware, requireUserType('parent'), createRegistration);

module.exports = router;
