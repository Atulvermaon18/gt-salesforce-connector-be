const express = require('express');
const userController = require('../controllers/userController.js');
const { authorizePermission, protect } = require('../middlewares/authHandler.js');
const router = express.Router();
const { registerSchema, loginSchema, validateRequest } = require('../utils/validationSchema.js');

router.post('/register', validateRequest(registerSchema), userController.register);
router.post('/reset-password', userController.resetPassword);
router.post('/forgot-password', userController.forgotPassword);
router.post('/login', validateRequest(loginSchema), userController.login);
router.post('/logout', userController.logout);
router.post('/refresh-token', userController.refreshToken);
router.get('/profile-image', protect, userController.getProfileImage);
router.post('assign-orgId', protect, userController.assignOrgId);
//logs APIs
router.get('/logs', protect, userController.getLoginLogoutLogs);

// admin APIs
router.get('/', protect,  userController.getUsers);
router.get('/:userId', protect,  userController.getUserById);
router.put('/update-status', protect,  userController.toggleUserStatus);
router.put('/profile', protect, userController.updateProfile);
router.put('/:userId', protect,  userController.updateUserById);
router.post('/assign-role', protect,  userController.assignRole);
router.delete('/deactivate', protect, userController.deactivateAccount);

module.exports = router;
