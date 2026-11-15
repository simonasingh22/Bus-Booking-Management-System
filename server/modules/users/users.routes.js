const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  getAllUsers,
  getUserById,
  updateUserStatus,
} = require('./users.controller');
const { protect, restrictTo } = require('../../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profiles and administrative user management
 */

// Current user profile routes
router.use(protect);

router.get('/profile', getProfile);
router.patch('/profile', updateProfile);

// Admin-only user management routes
router.use(restrictTo('admin'));

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.patch('/:id/status', updateUserStatus);

module.exports = router;
