const Route = require('./Route.model');
const Trip = require('../trips/Trip.model');
const { AppError, asyncHandler, sendSuccess } = require('../../utils/helpers');
const { logAuditAction } = require('../../middleware/audit');

/**
 * @desc    Get all routes with search and city filter
 * @route   GET /api/routes
 * @access  Public
 */
const getAllRoutes = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const query = {};

  if (req.query.isActive !== undefined) {
    query.isActive = req.query.isActive === 'true';
  } else if (!req.user || req.user.role === 'customer') {
    query.isActive = true;
  }

  if (req.query.sourceCity) {
    query.sourceCity = new RegExp(`^${req.query.sourceCity.trim()}$`, 'i');
  }

  if (req.query.destinationCity) {
    query.destinationCity = new RegExp(`^${req.query.destinationCity.trim()}$`, 'i');
  }

  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    query.$or = [{ sourceCity: searchRegex }, { destinationCity: searchRegex }];
  }

  const [routes, total] = await Promise.all([
    Route.find(query).sort({ sourceCity: 1, destinationCity: 1 }).skip(skip).limit(limit),
    Route.countDocuments(query),
  ]);

  sendSuccess(res, 200, 'Routes retrieved successfully.', {
    routes,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * @desc    Get distinct list of cities for search autocomplete
 * @route   GET /api/routes/cities
 * @access  Public
 */
const getDistinctCities = asyncHandler(async (req, res) => {
  const [sources, destinations] = await Promise.all([
    Route.distinct('sourceCity', { isActive: true }),
    Route.distinct('destinationCity', { isActive: true }),
  ]);

  const allCities = Array.from(new Set([...sources, ...destinations])).sort();

  sendSuccess(res, 200, 'Cities retrieved successfully.', {
    sources: sources.sort(),
    destinations: destinations.sort(),
    allCities,
  });
});

/**
 * @desc    Get single route by ID
 * @route   GET /api/routes/:id
 * @access  Public
 */
const getRouteById = asyncHandler(async (req, res, next) => {
  const route = await Route.findById(req.params.id);
  if (!route) {
    return next(new AppError('Route not found.', 404));
  }
  sendSuccess(res, 200, 'Route details retrieved.', { route });
});

/**
 * @desc    Create new transit route
 * @route   POST /api/routes
 * @access  Private (Admin or Operator)
 */
const createRoute = asyncHandler(async (req, res, next) => {
  const {
    sourceCity,
    sourceState,
    destinationCity,
    destinationState,
    distanceKm,
    estimatedDurationMinutes,
    stops,
  } = req.body;

  if (
    !sourceCity ||
    !sourceState ||
    !destinationCity ||
    !destinationState ||
    !distanceKm ||
    !estimatedDurationMinutes
  ) {
    return next(
      new AppError(
        'Please provide sourceCity, sourceState, destinationCity, destinationState, distanceKm, and estimatedDurationMinutes.',
        400
      )
    );
  }

  // Format stops and ensure default boarding / dropping endpoints if none provided
  let formattedStops = stops || [];
  if (formattedStops.length === 0) {
    formattedStops = [
      {
        stopName: `${sourceCity.trim()} Main Bus Stand`,
        city: sourceCity.trim(),
        stopType: 'boarding',
        order: 1,
        distanceFromSourceKm: 0,
        durationOffsetMinutes: 0,
      },
      {
        stopName: `${destinationCity.trim()} Central Terminal`,
        city: destinationCity.trim(),
        stopType: 'dropping',
        order: 2,
        distanceFromSourceKm: distanceKm,
        durationOffsetMinutes: estimatedDurationMinutes,
      },
    ];
  } else {
    // Ensure stops are ordered
    formattedStops.sort((a, b) => a.order - b.order);
  }

  const route = await Route.create({
    sourceCity: sourceCity.trim(),
    sourceState: sourceState.trim(),
    destinationCity: destinationCity.trim(),
    destinationState: destinationState.trim(),
    distanceKm: Number(distanceKm),
    estimatedDurationMinutes: Number(estimatedDurationMinutes),
    stops: formattedStops,
  });

  await logAuditAction({
    req,
    action: 'ROUTE_CREATE',
    entityType: 'Route',
    entityId: route._id,
    details: {
      source: `${route.sourceCity}, ${route.sourceState}`,
      destination: `${route.destinationCity}, ${route.destinationState}`,
    },
  });

  sendSuccess(res, 201, 'Route created successfully.', { route });
});

/**
 * @desc    Update route details or stops
 * @route   PATCH /api/routes/:id
 * @access  Private (Admin or Operator)
 */
const updateRoute = asyncHandler(async (req, res, next) => {
  const allowedUpdates = [
    'sourceCity',
    'sourceState',
    'destinationCity',
    'destinationState',
    'distanceKm',
    'estimatedDurationMinutes',
    'stops',
    'isActive',
  ];

  const updates = {};
  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  if (updates.stops && Array.isArray(updates.stops)) {
    updates.stops.sort((a, b) => a.order - b.order);
  }

  const route = await Route.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!route) {
    return next(new AppError('Route not found.', 404));
  }

  await logAuditAction({
    req,
    action: 'ROUTE_UPDATE',
    entityType: 'Route',
    entityId: route._id,
    details: updates,
  });

  sendSuccess(res, 200, 'Route updated successfully.', { route });
});

/**
 * @desc    Deactivate route
 * @route   DELETE /api/routes/:id
 * @access  Private (Admin only)
 */
const deleteRoute = asyncHandler(async (req, res, next) => {
  const activeTripsCount = await Trip.countDocuments({
    routeId: req.params.id,
    departureDate: { $gte: new Date() },
    status: { $in: ['scheduled', 'boarding'] },
  });

  if (activeTripsCount > 0) {
    return next(
      new AppError(
        `Cannot deactivate route: ${activeTripsCount} active trips are scheduled along this corridor.`,
        400
      )
    );
  }

  const route = await Route.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!route) {
    return next(new AppError('Route not found.', 404));
  }

  await logAuditAction({
    req,
    action: 'ROUTE_DELETE',
    entityType: 'Route',
    entityId: route._id,
    details: { isActive: false },
  });

  sendSuccess(res, 200, 'Route deactivated successfully.', { route });
});

module.exports = {
  getAllRoutes,
  getDistinctCities,
  getRouteById,
  createRoute,
  updateRoute,
  deleteRoute,
};
