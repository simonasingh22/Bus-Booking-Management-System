const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../users/User.model');
const Operator = require('../operators/Operator.model');
const { AppError, asyncHandler, sendSuccess } = require('../../utils/helpers');
const { logAuditAction } = require('../../middleware/audit');

/**
 * Sign JWT token for user
 */
const signToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'busbooking_dev_secret_key_2024_algions',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

/**
 * Set HTTP-only cookie and return token + sanitized user payload
 */
const createSendToken = (user, statusCode, req, res, message = 'Success') => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + (Number(process.env.JWT_COOKIE_EXPIRES_IN) || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  };

  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;
  delete userObj.passwordResetToken;
  delete userObj.passwordResetExpires;

  res.status(statusCode).json({
    success: true,
    message,
    token,
    data: {
      user: userObj,
    },
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res, next) => {
  const { name, email, password, phone, role, operatorName, operatorLicense } = req.body;

  if (!name || !email || !password) {
    return next(new AppError('Please provide name, email, and password.', 400));
  }

  // Prevent registration as admin via public API
  let assignedRole = 'customer';
  if (role === 'operator') {
    assignedRole = 'operator';
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return next(new AppError('An account with this email already exists.', 409));
  }

  let operatorId = null;

  // If registering as operator, optionally link or create an operator entity
  if (assignedRole === 'operator' && operatorName) {
    let operator = await Operator.findOne({ name: operatorName.trim() });
    if (!operator) {
      operator = await Operator.create({
        name: operatorName.trim(),
        contactEmail: email.toLowerCase(),
        contactPhone: phone || '9876543210',
        licenseNumber: operatorLicense || `LIC-${Date.now()}`,
        address: { city: 'Default', state: 'Default' },
      });
    }
    operatorId = operator._id;
  }

  const newUser = await User.create({
    name,
    email,
    password,
    phone,
    role: assignedRole,
    operatorId,
  });

  await logAuditAction({
    req,
    action: 'USER_REGISTER',
    entityType: 'User',
    entityId: newUser._id,
    userId: newUser._id,
    userName: newUser.name,
    userRole: newUser.role,
    details: { email: newUser.email, role: newUser.role },
  });

  createSendToken(newUser, 201, req, res, 'Registration successful.');
});

/**
 * @desc    Log in user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide both email and password.', 400));
  }

  // Find user and explicitly select password
  const user = await User.findOne({ email: email.toLowerCase() })
    .select('+password')
    .populate('operatorId');

  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Invalid email or password.', 401));
  }

  if (!user.isActive) {
    return next(
      new AppError('Your account has been deactivated. Please contact support.', 403)
    );
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  await logAuditAction({
    req,
    action: 'USER_LOGIN',
    entityType: 'User',
    entityId: user._id,
    userId: user._id,
    userName: user.name,
    userRole: user.role,
    details: { email: user.email, role: user.role },
  });

  createSendToken(user, 200, req, res, 'Login successful.');
});

/**
 * @desc    Get currently authenticated user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('operatorId');
  sendSuccess(res, 200, 'Current user retrieved.', { user });
});

/**
 * @desc    Log out user / clear cookie
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
  });

  if (req.user) {
    await logAuditAction({
      req,
      action: 'USER_LOGOUT',
      entityType: 'User',
      entityId: req.user._id,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
    });
  }

  sendSuccess(res, 200, 'Logged out successfully.');
});

/**
 * @desc    Update password of currently logged-in user
 * @route   PATCH /api/auth/update-password
 * @access  Private
 */
const updatePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(new AppError('Please provide both current and new password.', 400));
  }

  if (newPassword.length < 8) {
    return next(new AppError('New password must be at least 8 characters long.', 400));
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    return next(new AppError('Your current password is incorrect.', 401));
  }

  user.password = newPassword;
  await user.save();

  createSendToken(user, 200, req, res, 'Password updated successfully.');
});

/**
 * @desc    Forgot password – generate reset token
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(new AppError('Please provide an email address.', 400));
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Return standard message to prevent email enumeration
    return sendSuccess(res, 200, 'If that email is registered, a password reset link has been sent.');
  }

  // Generate random token
  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  await user.save({ validateBeforeSave: false });

  // In production, send email; in development/assessment, return token for verification
  sendSuccess(res, 200, 'Password reset token generated.', {
    resetToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined,
  });
});

/**
 * @desc    Reset password using token
 * @route   PATCH /api/auth/reset-password/:token
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res, next) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Token is invalid or has expired.', 400));
  }

  if (!req.body.password || req.body.password.length < 8) {
    return next(new AppError('Password must be at least 8 characters long.', 400));
  }

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  createSendToken(user, 200, req, res, 'Password reset successfully.');
});

module.exports = {
  register,
  login,
  getMe,
  logout,
  updatePassword,
  forgotPassword,
  resetPassword,
};
