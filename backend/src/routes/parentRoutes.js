const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const { getParentRegistrations } = require('../controllers/parentController');

router.get('/registrations', authMiddleware, getParentRegistrations);

module.exports = router;