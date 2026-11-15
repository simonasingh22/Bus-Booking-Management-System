const jwt = require('jsonwebtoken');
const User = require('../modules/users/User.model');
const { AppError, asyncHandler } = require('../utils/helpers');

/**
 * Protect routes: verifies JWT from Authorization header or cookie
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Check Authorization header (Bearer token)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  // 2. Or check cookie
  else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please log in to get access.', 401));
  }

  // 3. Verify token
  const decoded = jwt.verify(
    token,
    process.env.JWT_SECRET || 'busbooking_super_secret_jwt_key_2026'
  );

  // 4. Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  // 5. Check if user is active
  if (!currentUser.isActive) {
    return next(new AppError('Your account has been deactivated. Please contact support.', 403));
  }

  // Grant access
  req.user = currentUser;
  next();
});

/**
 * Optional authentication: populates req.user if valid token present, but doesn't block if not
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'busbooking_super_secret_jwt_key_2026'
      );
      const currentUser = await User.findById(decoded.id);
      if (currentUser && currentUser.isActive) {
        req.user = currentUser;
      }
    } catch {
      // Ignore token verification errors for optional routes
    }
  }
  next();
});

/**
 * Role-Based Access Control (RBAC): restrict access to specified roles
 * e.g., restrictTo('admin', 'operator')
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action.', 403)
      );
    }
    next();
  };
};

module.exports = {
  protect,
  optionalAuth,
  restrictTo,
  authorize: restrictTo, // alias
};
