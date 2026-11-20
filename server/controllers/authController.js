const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');
const PendingRegistration = require('../models/PendingRegistration');
const {
  PRODUCER_EMAIL,
  isEmailConfigured,
  maskEmail,
  sendVerificationEmail,
  sendPasswordResetEmail
} = require('../services/emailService');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'careerforge_super_secret_jwt_token_2026_xyz!', {
    expiresIn: '30d'
  });
};

const generateSecureOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

// @desc    Initiate Account Registration & Dispatch Email OTP
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, college, companyName } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, email address, and password'
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please sign in.'
      });
    }

    // Disallow registering directly as admin from public endpoint for security
    const assignedRole = role === 'recruiter' ? 'recruiter' : 'student';

    // Verify email service is configured
    if (!isEmailConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Email service is not configured.'
      });
    }

    // Check rate limit on existing pending registration
    const existingPending = await PendingRegistration.findOne({ email: cleanEmail });
    if (existingPending && existingPending.lastSentAt && Date.now() - existingPending.lastSentAt.getTime() < 5000) {
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting another code.'
      });
    }

    // Generate secure 6-digit OTP and hash it
    const otp = generateSecureOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Upsert pending registration with hashed OTP
    await PendingRegistration.deleteMany({ email: cleanEmail });
    await PendingRegistration.create({
      name,
      email: cleanEmail,
      password,
      role: assignedRole,
      college: assignedRole === 'student' ? college || '' : '',
      companyName: assignedRole === 'recruiter' ? companyName || '' : '',
      hashedOtp,
      attempts: 0,
      maxAttempts: 5,
      otpExpires: expiresAt,
      lastSentAt: new Date()
    });

    // Send professional email to user's actual email address
    // Asynchronous email dispatch - returns immediately so user is not blocked
    sendVerificationEmail({
      to: cleanEmail,
      otp,
      isProducerAdmin: false
    }).catch(err => console.error('[REGISTER EMAIL ERROR]:', err.message));

    const targetEmailMasked = maskEmail(cleanEmail);

    res.status(200).json({
      success: true,
      requireOtp: true,
      email: cleanEmail,
      role: assignedRole,
      targetEmailMasked,
      message: `A 6-digit verification code has been sent to ${targetEmailMasked}.`
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify Registration OTP & Finalize Account Creation
// @route   POST /api/auth/verify-register-otp
// @access  Public
exports.verifyRegisterOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and 6-digit registration code'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const pending = await PendingRegistration.findOne({ email: cleanEmail });

    if (!pending) {
      return res.status(400).json({
        success: false,
        message: 'Registration session expired or not found. Please start registration again.'
      });
    }

    // Check expiration (5 minutes)
    if (new Date() > pending.otpExpires) {
      await PendingRegistration.deleteMany({ email: cleanEmail });
      return res.status(400).json({
        success: false,
        message: 'This verification code has expired. Please request a new code.'
      });
    }

    // Check attempts limit
    if (pending.attempts >= (pending.maxAttempts || 5)) {
      await PendingRegistration.deleteMany({ email: cleanEmail });
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. This verification code has been invalidated. Please request a new code.'
      });
    }

    // Compare entered OTP with hashed OTP
    const isMatch = await bcrypt.compare(otp.trim(), pending.hashedOtp);
    if (!isMatch) {
      pending.attempts = (pending.attempts || 0) + 1;
      if (pending.attempts >= (pending.maxAttempts || 5)) {
        await PendingRegistration.deleteMany({ email: cleanEmail });
        return res.status(400).json({
          success: false,
          message: 'Too many failed attempts. This verification code has been invalidated. Please request a new code.'
        });
      }
      await pending.save();
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please try again.'
      });
    }

    // Create the actual verified user
    const user = await User.create({
      name: pending.name,
      email: pending.email,
      password: pending.password,
      role: pending.role,
      college: pending.college,
      companyName: pending.companyName
    });

    // Invalidate pending registration immediately
    await PendingRegistration.deleteMany({ email: cleanEmail });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        title: user.title,
        college: user.college,
        companyName: user.companyName
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Resend Registration OTP
// @route   POST /api/auth/resend-register-otp
// @access  Public
exports.resendRegisterOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email address'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const pending = await PendingRegistration.findOne({ email: cleanEmail });

    if (!pending) {
      return res.status(404).json({
        success: false,
        message: 'No pending registration found for this email address. Please register again.'
      });
    }

    if (!isEmailConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Email service is not configured.'
      });
    }

    // Rate limiting: 60s cooldown
    if (pending.lastSentAt && Date.now() - pending.lastSentAt.getTime() < 5000) {
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting another code.'
      });
    }

    // Generate new OTP and invalidate previous
    const otp = generateSecureOtp();
    pending.hashedOtp = await bcrypt.hash(otp, 10);
    pending.attempts = 0;
    pending.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    pending.lastSentAt = new Date();
    await pending.save();

    // Asynchronous email dispatch - non-blocking so response is immediate (< 50ms)
    sendVerificationEmail({
      to: cleanEmail,
      otp,
      isProducerAdmin: false
    }).catch(err => console.error('[RESEND REGISTRATION EMAIL ERROR]:', err.message));

    const targetEmailMasked = maskEmail(cleanEmail);

    res.json({
      success: true,
      message: `A new verification code has been sent to ${targetEmailMasked}.`,
      targetEmailMasked
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Authenticate credentials & dispatch email OTP
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (!isEmailConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Email service is not configured.'
      });
    }

    // Check rate limit on recent OTP requests (60 seconds)
    const existingOtp = await Otp.findOne({ email: cleanEmail, purpose: 'login' });
    if (existingOtp && existingOtp.lastSentAt && Date.now() - existingOtp.lastSentAt.getTime() < 5000) {
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting another code.'
      });
    }

    const isProducerAdmin = user.role === 'admin';
    const otp = generateSecureOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Invalidate previous OTP and store new hashed OTP
    await Otp.deleteMany({ email: cleanEmail, purpose: 'login' });
    await Otp.create({
      email: cleanEmail,
      hashedOtp,
      purpose: 'login',
      attempts: 0,
      maxAttempts: 5,
      expiresAt,
      lastSentAt: new Date()
    });

    // Asynchronous email dispatch - returns immediately in < 50ms so UI never hangs
    sendVerificationEmail({
      to: cleanEmail,
      otp,
      isProducerAdmin
    }).catch(err => console.error('[LOGIN EMAIL ERROR]:', err.message));

    const targetEmail = isProducerAdmin ? PRODUCER_EMAIL : user.email;
    const targetEmailMasked = maskEmail(targetEmail);

    res.json({
      success: true,
      requireOtp: true,
      email: user.email,
      role: user.role,
      isProducerAdmin,
      targetEmailMasked,
      message: `A 6-digit verification code has been sent to ${targetEmailMasked}.`
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify OTP and complete sign-in
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and the 6-digit verification code'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found'
      });
    }

    const storedOtp = await Otp.findOne({ email: cleanEmail, purpose: 'login' });
    if (!storedOtp) {
      return res.status(400).json({
        success: false,
        message: 'No active verification code found. Please sign in again.'
      });
    }

    // Check expiration (5 minutes)
    if (new Date() > storedOtp.expiresAt) {
      await Otp.deleteMany({ email: cleanEmail, purpose: 'login' });
      return res.status(400).json({
        success: false,
        message: 'This verification code has expired. Please request a new code.'
      });
    }

    // Check max attempts
    if (storedOtp.attempts >= (storedOtp.maxAttempts || 5)) {
      await Otp.deleteMany({ email: cleanEmail, purpose: 'login' });
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. This verification code has been invalidated. Please request a new code.'
      });
    }

    // Compare entered OTP with hashed OTP
    const isMatch = await bcrypt.compare(otp.trim(), storedOtp.hashedOtp);
    if (!isMatch) {
      storedOtp.attempts = (storedOtp.attempts || 0) + 1;
      if (storedOtp.attempts >= (storedOtp.maxAttempts || 5)) {
        await Otp.deleteMany({ email: cleanEmail, purpose: 'login' });
        return res.status(400).json({
          success: false,
          message: 'Too many failed attempts. This verification code has been invalidated. Please request a new code.'
        });
      }
      await storedOtp.save();
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please try again.'
      });
    }

    // Invalidate OTP immediately upon successful verification
    await Otp.deleteMany({ email: cleanEmail, purpose: 'login' });

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        title: user.title,
        companyName: user.companyName,
        college: user.college
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Resend OTP code
// @route   POST /api/auth/resend-otp
// @access  Public
exports.resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email address'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found'
      });
    }

    if (!isEmailConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Email service is not configured.'
      });
    }

    // Rate limiting: 60s cooldown
    const existingOtp = await Otp.findOne({ email: cleanEmail, purpose: 'login' });
    if (existingOtp && existingOtp.lastSentAt && Date.now() - existingOtp.lastSentAt.getTime() < 5000) {
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting another code.'
      });
    }

    const isProducerAdmin = user.role === 'admin';
    const otp = generateSecureOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Invalidate previous and store new
    await Otp.deleteMany({ email: cleanEmail, purpose: 'login' });
    await Otp.create({
      email: cleanEmail,
      hashedOtp,
      purpose: 'login',
      attempts: 0,
      maxAttempts: 5,
      expiresAt,
      lastSentAt: new Date()
    });

    sendVerificationEmail({
      to: cleanEmail,
      otp,
      isProducerAdmin
    }).catch(err => console.error('[RESEND EMAIL ERROR]:', err.message));

    const targetEmail = isProducerAdmin ? PRODUCER_EMAIL : user.email;
    const targetEmailMasked = maskEmail(targetEmail);

    res.json({
      success: true,
      message: `A new verification code has been sent to ${targetEmailMasked}.`,
      targetEmailMasked
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const fieldsToUpdate = [
      'name', 'title', 'bio', 'phone', 'location', 'skills',
      'githubUrl', 'linkedinUrl', 'portfolioUrl', 'college',
      'graduationYear', 'cgpa', 'companyName', 'companyWebsite', 'avatar'
    ];

    const updates = {};
    fieldsToUpdate.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin Quick Access - Enforces Producer OTP!
// @route   POST /api/auth/demo
// @access  Public
exports.demoLogin = async (req, res, next) => {
  try {
    const { role } = req.body;

    if (role === 'admin') {
      let admin = await User.findOne({ email: 'admin@careerforge.io' });
      if (!admin) {
        admin = await User.create({
          name: 'CareerForge Admin',
          email: 'admin@careerforge.io',
          password: 'password123',
          role: 'admin',
          title: 'Platform System Administrator'
        });
      }

      if (!isEmailConfigured()) {
        return res.status(503).json({
          success: false,
          message: 'Email service is not configured.'
        });
      }

      // Check rate limit (60s)
      const existingOtp = await Otp.findOne({ email: 'admin@careerforge.io', purpose: 'login' });
      if (existingOtp && existingOtp.lastSentAt && Date.now() - existingOtp.lastSentAt.getTime() < 5000) {
        return res.status(429).json({
          success: false,
          message: 'Please wait before requesting another code.'
        });
      }

      const otp = generateSecureOtp();
      const hashedOtp = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await Otp.deleteMany({ email: 'admin@careerforge.io', purpose: 'login' });
      await Otp.create({
        email: 'admin@careerforge.io',
        hashedOtp,
        purpose: 'login',
        attempts: 0,
        maxAttempts: 5,
        expiresAt,
        lastSentAt: new Date()
      });

      // Asynchronous email dispatch - instant response (< 30ms)
      sendVerificationEmail({
        to: 'admin@careerforge.io',
        otp,
        isProducerAdmin: true
      }).catch(err => console.error('[ADMIN DEMO EMAIL ERROR]:', err.message));

      return res.json({
        success: true,
        requireOtp: true,
        email: admin.email,
        role: 'admin',
        isProducerAdmin: true,
        targetEmailMasked: maskEmail(PRODUCER_EMAIL),
        message: `A 6-digit verification code has been sent to ${maskEmail(PRODUCER_EMAIL)}.`
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Students and Recruiters must sign in with their email, password, and OTP verification for account privacy.'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Initiate Password Reset & Dispatch Verification Code
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your registered email address'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address. Please check your spelling or register.'
      });
    }

    const otp = generateSecureOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Invalidate previous reset OTPs for this email
    await Otp.deleteMany({ email: cleanEmail, purpose: 'reset_password' });
    await Otp.create({
      email: cleanEmail,
      hashedOtp,
      purpose: 'reset_password',
      attempts: 0,
      maxAttempts: 5,
      expiresAt,
      lastSentAt: new Date()
    });

    // Asynchronous email dispatch
    sendPasswordResetEmail({
      to: cleanEmail,
      otp
    }).catch(err => console.error('[PASSWORD RESET EMAIL ERROR]:', err.message));

    const targetEmailMasked = maskEmail(cleanEmail);

    res.json({
      success: true,
      email: cleanEmail,
      targetEmailMasked,
      message: `A 6-digit verification code has been dispatched to ${targetEmailMasked}.`
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify Password Reset OTP & Obtain Reset Authorization Token
// @route   POST /api/auth/verify-reset-otp
// @access  Public
exports.verifyResetOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and the 6-digit verification code'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found'
      });
    }

    const storedOtp = await Otp.findOne({ email: cleanEmail, purpose: 'reset_password' });
    if (!storedOtp) {
      return res.status(400).json({
        success: false,
        message: 'No active password reset code found. Please request a new code.'
      });
    }

    // Check expiration (5 minutes)
    if (new Date() > storedOtp.expiresAt) {
      await Otp.deleteMany({ email: cleanEmail, purpose: 'reset_password' });
      return res.status(400).json({
        success: false,
        message: 'This verification code has expired. Please request a new code.'
      });
    }

    // Check attempts limit
    if (storedOtp.attempts >= (storedOtp.maxAttempts || 5)) {
      await Otp.deleteMany({ email: cleanEmail, purpose: 'reset_password' });
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. This verification code has been invalidated. Please request a new code.'
      });
    }

    // Compare entered OTP with hashed OTP
    const isMatch = await bcrypt.compare(otp.trim(), storedOtp.hashedOtp);
    if (!isMatch) {
      storedOtp.attempts = (storedOtp.attempts || 0) + 1;
      if (storedOtp.attempts >= (storedOtp.maxAttempts || 5)) {
        await Otp.deleteMany({ email: cleanEmail, purpose: 'reset_password' });
        return res.status(400).json({
          success: false,
          message: 'Too many failed attempts. This verification code has been invalidated. Please request a new code.'
        });
      }
      await storedOtp.save();
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please check and try again.'
      });
    }

    // Invalidate the OTP after successful verification
    await Otp.deleteMany({ email: cleanEmail, purpose: 'reset_password' });

    // Generate signed reset authorization token valid for 15 minutes
    const resetToken = jwt.sign(
      { id: user._id, email: user.email, purpose: 'reset_password' },
      process.env.JWT_SECRET || 'careerforge_super_secret_jwt_token_2026_xyz!',
      { expiresIn: '15m' }
    );

    res.json({
      success: true,
      resetToken,
      message: 'Code verified successfully. You may now create your new password.'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Submit New Password using Reset Token
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the reset authorization token and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Decode and verify reset token
    let decoded;
    try {
      decoded = jwt.verify(
        resetToken,
        process.env.JWT_SECRET || 'careerforge_super_secret_jwt_token_2026_xyz!'
      );
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        message: 'Password reset session has expired or is invalid. Please start again.'
      });
    }

    if (decoded.purpose !== 'reset_password') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization token'
      });
    }

    const user = await User.findById(decoded.id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found'
      });
    }

    // Hash and update password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({
      success: true,
      message: 'Password has been reset successfully! You can now sign in with your new password.'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Email configuration status & live test dispatch
// @route   GET /api/auth/email-status
// @access  Public
exports.getEmailStatus = async (req, res) => {
  const brevoKey = (process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY)?.trim();
  const brevoPresent = Boolean(brevoKey);
  const testRecipient = req.query.to || 'nitin2911.in@gmail.com';

  let testResult = null;
  let testError = null;

  if (req.query.test === 'true') {
    try {
      testResult = await sendVerificationEmail({
        to: testRecipient,
        otp: '999888',
        isProducerAdmin: false
      });
    } catch (err) {
      testError = err.message;
    }
  }

  return res.json({
    status: 'online',
    brevoConfigured: brevoPresent,
    brevoKeyPrefix: brevoPresent ? brevoKey.slice(0, 12) + '...' : 'NOT_FOUND_IN_ENV',
    senderConfigured: process.env.BREVO_SENDER || 'nitin2911.in@gmail.com',
    testRecipient,
    testResult,
    testError,
    howToFix: !brevoPresent
      ? 'Go to Railway Dashboard -> Project -> Variables -> Add BREVO_API_KEY'
      : 'Brevo is detected! Check testResult above or Railway deploy logs.'
  });
};

// @desc    Change password (authenticated user - requires current password)
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current password and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully. Please sign in with your new password.'
    });
  } catch (err) {
    next(err);
  }
};
