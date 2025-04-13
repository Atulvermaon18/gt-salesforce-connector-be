const express = require("express");
const roleController = require("../controllers/roleController.js");
const { authorizePermission, protect } = require('../middlewares/authHandler.js');

const router = express.Router();

router.get("/", protect, authorizePermission('GET_ROLE'),roleController.getRoles);
router.post("/", protect, authorizePermission('CREATE_ROLE'),roleController.createRole);
router.put("/:roleId", protect, roleController.updateRole);
router.delete("/:roleId", protect, authorizePermission('DELETE_ROLE'),roleController.deleteRole);
router.get('/:roleId/permissions', protect, authorizePermission('GET_ROLE'),roleController.getPermissions);
router.post('/:roleId/assign-permissions', protect, authorizePermission('UPDATE_ROLE'),roleController.assignPermissions);
router.put('/:roleId/update-permissions', protect, authorizePermission('UPDATE_ROLE'),roleController.updatePermissions);
router.delete('/:roleId/remove-permission/:permissionId', protect, authorizePermission('UPDATE_ROLE'), roleController.removePermission);

module.exports = router;
