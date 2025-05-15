const express = require('express');
const router = express.Router();
const sobjectController = require('../controllers/sobjectController');
const { protect } = require('../middlewares/authHandler');

// Get all sObjects
router.get('/', protect, sobjectController.getSObjects);

// Get sObject with fields by name
router.get('/:sobjectName', protect, sobjectController.getSObjectWithFields);

// Save sObject permission
router.post('/permission', protect, sobjectController.saveSObjectPermission);

// Save field permission
router.post('/field/permission', protect, sobjectController.saveFieldPermission);

// Batch save field permissions
router.post('/fields/permissions', protect, sobjectController.batchSaveFieldPermissions);

module.exports = router; 