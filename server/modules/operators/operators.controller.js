const Operator = require('./Operator.model');
const Bus = require('../buses/Bus.model');
const { AppError, asyncHandler, sendSuccess } = require('../../utils/helpers');
const { logAuditAction } = require('../../middleware/audit');

/**
 * @desc    Get all bus operators with search, filter, and pagination
 * @route   GET /api/operators
 * @access  Public
 */
const getAllOperators = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const query = {};

  // By default, public only sees active operators unless admin specifies isActive filter
  if (req.query.isActive !== undefined) {
    query.isActive = req.query.isActive === 'true';
  } else if (!req.user || req.user.role !== 'admin') {
    query.isActive = true;
  }

  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    query.$or = [{ name: searchRegex }, { 'address.city': searchRegex }, { licenseNumber: searchRegex }];
  }

  const [operators, total] = await Promise.all([
    Operator.find(query).sort({ rating: -1, name: 1 }).skip(skip).limit(limit),
    Operator.countDocuments(query),
  ]);

  sendSuccess(res, 200, 'Operators retrieved successfully.', {
    operators,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * @desc    Get single operator details with fleet count
 * @route   GET /api/operators/:id
 * @access  Public
 */
const getOperatorById = asyncHandler(async (req, res, next) => {
  const operator = await Operator.findById(req.params.id);
  if (!operator) {
    return next(new AppError('Operator not found.', 404));
  }

  const busCount = await Bus.countDocuments({ operatorId: operator._id, status: 'active' });

  sendSuccess(res, 200, 'Operator retrieved successfully.', {
    operator,
    stats: {
      activeBuses: busCount,
    },
  });
});

/**
 * @desc    Create new operator (Admin only)
 * @route   POST /api/operators
 * @access  Private (Admin)
 */
const createOperator = asyncHandler(async (req, res, next) => {
  const { name, contactEmail, contactPhone, licenseNumber, address, cancellationPolicy, logo } = req.body;

  if (!name || !contactEmail || !contactPhone || !licenseNumber) {
    return next(new AppError('Please provide name, contactEmail, contactPhone, and licenseNumber.', 400));
  }

  const existingLicense = await Operator.findOne({ licenseNumber: licenseNumber.trim().toUpperCase() });
  if (existingLicense) {
    return next(new AppError('An operator with this license number already exists.', 409));
  }

  const operator = await Operator.create({
    name,
    contactEmail,
    contactPhone,
    licenseNumber: licenseNumber.trim().toUpperCase(),
    address: address || { city: 'Bengaluru', state: 'Karnataka' },
    cancellationPolicy: cancellationPolicy || undefined,
    logo,
  });

  await logAuditAction({
    req,
    action: 'BUS_CREATE', // logged under fleet setup
    entityType: 'Operator',
    entityId: operator._id,
    details: { name: operator.name, licenseNumber: operator.licenseNumber },
  });

  sendSuccess(res, 201, 'Operator created successfully.', { operator });
});

/**
 * @desc    Update operator profile
 * @route   PATCH /api/operators/:id
 * @access  Private (Admin or Owner Operator)
 */
const updateOperator = asyncHandler(async (req, res, next) => {
  // Check authorization: Admin can update any operator; Operator can only update their own
  if (
    req.user.role === 'operator' &&
    (!req.user.operatorId || req.user.operatorId.toString() !== req.params.id)
  ) {
    return next(new AppError('You can only update your own operator profile.', 403));
  }

  const allowedUpdates = [
    'name',
    'contactEmail',
    'contactPhone',
    'address',
    'cancellationPolicy',
    'logo',
    'isActive',
  ];

  const updates = {};
  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      // Non-admins cannot modify isActive flag
      if (field === 'isActive' && req.user.role !== 'admin') return;
      updates[field] = req.body[field];
    }
  });

  const operator = await Operator.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!operator) {
    return next(new AppError('Operator not found.', 404));
  }

  await logAuditAction({
    req,
    action: 'BUS_UPDATE',
    entityType: 'Operator',
    entityId: operator._id,
    details: updates,
  });

  sendSuccess(res, 200, 'Operator updated successfully.', { operator });
});

/**
 * @desc    Deactivate operator (Admin only)
 * @route   DELETE /api/operators/:id
 * @access  Private (Admin)
 */
const deleteOperator = asyncHandler(async (req, res, next) => {
  const operator = await Operator.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!operator) {
    return next(new AppError('Operator not found.', 404));
  }

  await logAuditAction({
    req,
    action: 'BUS_DELETE',
    entityType: 'Operator',
    entityId: operator._id,
    details: { deactivated: true },
  });

  sendSuccess(res, 200, 'Operator deactivated successfully.', { operator });
});

module.exports = {
  getAllOperators,
  getOperatorById,
  createOperator,
  updateOperator,
  deleteOperator,
};
