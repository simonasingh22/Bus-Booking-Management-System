const User = require('./User.model');
const { AppError, asyncHandler, sendSuccess } = require('../../utils/helpers');
const { logAuditAction } = require('../../middleware/audit');

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('operatorId');
  sendSuccess(res, 200, 'Profile retrieved.', { user });
});

/**
 * @desc    Update user profile
 * @route   PATCH /api/users/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res, next) => {
  const allowedFields = ['name', 'phone', 'address', 'avatar'];
  const updates = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  sendSuccess(res, 200, 'Profile updated successfully.', { user: updatedUser });
});

/**
 * @desc    Get all users with search, role filter, pagination (Admin only)
 * @route   GET /api/users
 * @access  Private (Admin)
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const query = {};

  if (req.query.role) {
    query.role = req.query.role;
  }

  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    query.$or = [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }];
  }

  if (req.query.isActive !== undefined) {
    query.isActive = req.query.isActive === 'true';
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .populate('operatorId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(query),
  ]);

  sendSuccess(res, 200, 'Users retrieved successfully.', {
    users,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * @desc    Get single user details by ID (Admin only)
 * @route   GET /api/users/:id
 * @access  Private (Admin)
 */
const getUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).populate('operatorId');
  if (!user) {
    return next(new AppError('User not found.', 404));
  }
  sendSuccess(res, 200, 'User details retrieved.', { user });
});

/**
 * @desc    Update user active/inactive status (Admin only)
 * @route   PATCH /api/users/:id/status
 * @access  Private (Admin)
 */
const updateUserStatus = asyncHandler(async (req, res, next) => {
  const { isActive } = req.body;
  if (isActive === undefined) {
    return next(new AppError('Please provide isActive boolean status.', 400));
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: Boolean(isActive) },
    { new: true }
  );

  if (!user) {
    return next(new AppError('User not found.', 404));
  }

  await logAuditAction({
    req,
    action: 'USER_UPDATE',
    entityType: 'User',
    entityId: user._id,
    details: { updatedStatus: user.isActive },
  });

  sendSuccess(res, 200, `User account ${user.isActive ? 'activated' : 'deactivated'} successfully.`, {
    user,
  });
});

module.exports = {
  getProfile,
  updateProfile,
  getAllUsers,
  getUserById,
  updateUserStatus,
};
