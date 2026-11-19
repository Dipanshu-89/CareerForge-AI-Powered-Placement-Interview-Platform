const express = require('express');
const router = express.Router();
const {
  register,
  verifyRegisterOtp,
  resendRegisterOtp,
  login,
  verifyOtp,
  resendOtp,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  getMe,
  updateProfile,
  demoLogin,
  getEmailStatus
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/verify-register-otp', verifyRegisterOtp);
router.post('/resend-register-otp', resendRegisterOtp);
router.post('/login', login);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);
router.post('/demo', demoLogin);
router.get('/email-status', getEmailStatus);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

module.exports = router;
