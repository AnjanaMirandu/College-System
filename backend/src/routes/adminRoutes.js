const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getDashboard,
  updateRegistrationSettings,
  createTeacher,
  importTeachers,
  generateAdminSlots,
  deleteTeacher,
  deleteTeachers,
  deleteParent,
  deleteParents,
  deleteSlot,
  deleteSlots,
  cancelRegistration,
} = require('../controllers/adminController');

const router = express.Router();

router.get('/dashboard', authMiddleware, getDashboard);
router.patch('/registration-settings', authMiddleware, updateRegistrationSettings);
router.post('/teachers', authMiddleware, createTeacher);
router.post('/teachers/import', authMiddleware, importTeachers);
router.post('/slots/generate', authMiddleware, generateAdminSlots);
router.post('/slots/delete', authMiddleware, deleteSlots);
router.post('/teachers/delete', authMiddleware, deleteTeachers);
router.post('/parents/delete', authMiddleware, deleteParents);
router.delete('/teachers/:id', authMiddleware, deleteTeacher);
router.delete('/parents/:id', authMiddleware, deleteParent);
router.delete('/slots/:id', authMiddleware, deleteSlot);
router.patch('/registrations/:id/cancel', authMiddleware, cancelRegistration);

module.exports = router;
