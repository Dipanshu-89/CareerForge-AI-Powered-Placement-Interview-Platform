const express = require('express');
const router = express.Router();
const {
  getMyResume,
  saveResume,
  getResumeById,
  uploadResumeFile
} = require('../controllers/resumeController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/my-resume', protect, authorize('student'), getMyResume);
router.put('/', protect, authorize('student'), saveResume);
router.post('/upload', protect, authorize('student'), uploadResumeFile);
router.get('/:id', protect, getResumeById);

module.exports = router;
