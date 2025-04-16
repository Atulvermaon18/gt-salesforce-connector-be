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
router.post('assign-orgId', protect, authorizePermission('SETTINGS'), userController.assignOrgId);
//logs APIs
router.get('/logs', protect, authorizePermission(['VIEW_SELF_AUDIT','VIEW_ALL_AUDIT']), userController.getLoginLogoutLogs);

// admin APIs
router.get('/', protect, authorizePermission('USER_MANAGEMENT'), userController.getUsers);
router.get('/:userId', protect, authorizePermission('USER_MANAGEMENT'), userController.getUserById);
router.put('/update-status', protect, authorizePermission('USER_MANAGEMENT'), userController.toggleUserStatus);
router.put('/profile', protect, authorizePermission('UPDATE_PROFILE'), userController.updateProfile);
router.put('/:userId', protect, authorizePermission('USER_MANAGEMENT'), userController.updateUserById);
router.post('/assign-role', protect, authorizePermission('USER_MANAGEMENT'), userController.assignRole);
router.delete('/deactivate', protect, authorizePermission('DEACTIVATE_ACCOUNT'), userController.deactivateAccount);

module.exports = router;
