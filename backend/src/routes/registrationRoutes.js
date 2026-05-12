const express = require('express');
const router = express.Router();

const { createRegistration } = require('../controllers/registrationController');

router.post('/registrations', createRegistration);

module.exports = router;