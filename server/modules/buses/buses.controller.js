const Bus = require('./Bus.model');
const Operator = require('../operators/Operator.model');
const Trip = require('../trips/Trip.model');
const { AppError, asyncHandler, sendSuccess } = require('../../utils/helpers');
const { generateSeatTemplate } = require('../../utils/seatLayoutGenerator');
const { logAuditAction } = require('../../middleware/audit');

/**
 * @desc    Get buses with filter, search, pagination, and role-based scoping
 * @route   GET /api/buses
 * @access  Private/Public
 */
const getAllBuses = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const query = {};

  // Role scoping: Operators can ONLY view their own fleet
  if (req.user && req.user.role === 'operator') {
    if (!req.user.operatorId) {
      return sendSuccess(res, 200, 'No buses found for this operator account.', {
        buses: [],
        pagination: { total: 0, page, limit, pages: 0 },
      });
    }
    query.operatorId = req.user.operatorId;
  } else if (req.query.operatorId) {
    query.operatorId = req.query.operatorId;
  }

  if (req.query.busType) {
    query.busType = req.query.busType;
  }

  if (req.query.status) {
    query.status = req.query.status;
  }

  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    query.$or = [{ busNumber: searchRegex }, { name: searchRegex }];
  }

  const [buses, total] = await Promise.all([
    Bus.find(query)
      .populate('operatorId', 'name contactPhone contactEmail')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Bus.countDocuments(query),
  ]);

  sendSuccess(res, 200, 'Buses retrieved successfully.', {
    buses,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * @desc    Get single bus details
 * @route   GET /api/buses/:id
 * @access  Private/Public
 */
const getBusById = asyncHandler(async (req, res, next) => {
  const bus = await Bus.findById(req.params.id).populate('operatorId', 'name contactPhone rating');
  if (!bus) {
    return next(new AppError('Bus not found.', 404));
  }

  // Operator isolation
  if (
    req.user &&
    req.user.role === 'operator' &&
    req.user.operatorId?.toString() !== bus.operatorId._id.toString()
  ) {
    return next(new AppError('You do not have access to this bus.', 403));
  }

  sendSuccess(res, 200, 'Bus details retrieved.', { bus });
});

/**
 * @desc    Register a new bus into fleet
 * @route   POST /api/buses
 * @access  Private (Admin or Operator)
 */
const createBus = asyncHandler(async (req, res, next) => {
  let {
    busNumber,
    name,
    operatorId,
    busType,
    totalSeats,
    layoutType,
    deckType,
    seatTemplate,
    amenities,
  } = req.body;

  if (!busNumber || !name || !busType || !totalSeats) {
    return next(
      new AppError('Please provide busNumber, name, busType, and totalSeats count.', 400)
    );
  }

  // Role scoping: If operator is creating, bind strictly to their operatorId
  if (req.user.role === 'operator') {
    if (!req.user.operatorId) {
      return next(
        new AppError('Your account is not linked to an active operator profile.', 400)
      );
    }
    operatorId = req.user.operatorId;
  } else if (!operatorId) {
    return next(new AppError('Please specify the operatorId for this bus.', 400));
  }

  // Check operator exists
  const operatorExists = await Operator.findById(operatorId);
  if (!operatorExists) {
    return next(new AppError('Specified operator does not exist.', 404));
  }

  // Format bus registration number
  const formattedBusNumber = busNumber.trim().toUpperCase().replace(/[\s-]/g, '');

  const existingBus = await Bus.findOne({ busNumber: formattedBusNumber });
  if (existingBus) {
    return next(
      new AppError(`Bus with registration number ${formattedBusNumber} already exists.`, 409)
    );
  }

  // Auto-generate seat template if not provided or incomplete
  if (!seatTemplate || !Array.isArray(seatTemplate) || seatTemplate.length === 0) {
    seatTemplate = generateSeatTemplate({
      totalSeats: Number(totalSeats),
      layoutType: layoutType || '2x2',
      busType,
      deckType: deckType || 'single',
    });
  }

  const bus = await Bus.create({
    busNumber: formattedBusNumber,
    operatorId,
    name,
    busType,
    totalSeats: Number(totalSeats),
    layoutType: layoutType || '2x2',
    deckType: deckType || 'single',
    seatTemplate,
    amenities: amenities || ['Charging Point', 'Emergency Exit'],
  });

  await logAuditAction({
    req,
    action: 'BUS_CREATE',
    entityType: 'Bus',
    entityId: bus._id,
    details: { busNumber: bus.busNumber, busType: bus.busType, operatorId },
  });

  sendSuccess(res, 201, 'Bus registered successfully.', { bus });
});

/**
 * @desc    Update bus details
 * @route   PATCH /api/buses/:id
 * @access  Private (Admin or Operator)
 */
const updateBus = asyncHandler(async (req, res, next) => {
  const bus = await Bus.findById(req.params.id);
  if (!bus) {
    return next(new AppError('Bus not found.', 404));
  }

  // Check operator ownership
  if (
    req.user.role === 'operator' &&
    (!req.user.operatorId || req.user.operatorId.toString() !== bus.operatorId.toString())
  ) {
    return next(new AppError('You do not have permission to modify this bus.', 403));
  }

  const allowedUpdates = ['name', 'status', 'amenities', 'layoutType', 'seatTemplate'];
  const updates = {};

  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  // If changing seat layout, check if bus has future scheduled trips
  if (req.body.seatTemplate || req.body.layoutType) {
    const activeTripsCount = await Trip.countDocuments({
      busId: bus._id,
      departureDate: { $gte: new Date() },
      status: { $in: ['scheduled', 'boarding'] },
    });

    if (activeTripsCount > 0) {
      return next(
        new AppError(
          `Cannot modify seat layout because this bus is assigned to ${activeTripsCount} upcoming active trips.`,
          400
        )
      );
    }
  }

  const updatedBus = await Bus.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  await logAuditAction({
    req,
    action: 'BUS_UPDATE',
    entityType: 'Bus',
    entityId: bus._id,
    details: updates,
  });

  sendSuccess(res, 200, 'Bus updated successfully.', { bus: updatedBus });
});

/**
 * @desc    Deactivate or remove bus
 * @route   DELETE /api/buses/:id
 * @access  Private (Admin or Operator)
 */
const deleteBus = asyncHandler(async (req, res, next) => {
  const bus = await Bus.findById(req.params.id);
  if (!bus) {
    return next(new AppError('Bus not found.', 404));
  }

  if (
    req.user.role === 'operator' &&
    (!req.user.operatorId || req.user.operatorId.toString() !== bus.operatorId.toString())
  ) {
    return next(new AppError('You do not have permission to delete this bus.', 403));
  }

  // Prevent deletion if bus is in upcoming scheduled trips
  const activeTripsCount = await Trip.countDocuments({
    busId: bus._id,
    departureDate: { $gte: new Date() },
    status: { $in: ['scheduled', 'boarding'] },
  });

  if (activeTripsCount > 0) {
    return next(
      new AppError(
        `Cannot remove bus: it has ${activeTripsCount} scheduled future trips. Cancel or reassign those trips first.`,
        400
      )
    );
  }

  bus.status = 'inactive';
  await bus.save();

  await logAuditAction({
    req,
    action: 'BUS_DELETE',
    entityType: 'Bus',
    entityId: bus._id,
    details: { status: 'inactive' },
  });

  sendSuccess(res, 200, 'Bus deactivated successfully.', { bus });
});

module.exports = {
  getAllBuses,
  getBusById,
  createBus,
  updateBus,
  deleteBus,
};
