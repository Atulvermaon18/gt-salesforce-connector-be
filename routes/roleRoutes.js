const express = require('express');
const router = express.Router();
const {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  addUserToRole,
  removeUserFromRole
} = require('../controllers/roleController');
// const { protect, admin } = require('../middleware/authMiddleware');

// Get all roles
router.get('/',  getRoles);

// Get single role
router.get('/:id',  getRoleById);

// Create role
router.post('/',  createRole);

// Update role
router.put('/:id',  updateRole);

// Delete role
router.delete('/:id',  deleteRole);

// Add user to role
router.post('/:id/users',  addUserToRole);

// Remove user from role
router.delete('/:id/users/:userId',  removeUserFromRole);

module.exports = router;
