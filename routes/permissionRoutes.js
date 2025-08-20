const express = require("express");
const { getPermissions, createPermission, updatePermission, deletePermission,getPermissionList ,getPermissionsById} = require("../controllers/permissionController.js");
const { authorizePermission, protect } = require('../middlewares/authHandler.js');

const router = express.Router();

router.get("/", protect, getPermissions);
router.get("/list",protect,   getPermissionList); 
router.get("/:permissionId", protect, getPermissionsById);

router.post("/",protect, createPermission);
router.put("/:permissionId", protect,updatePermission);
router.delete("/:permissionId", protect, deletePermission);

module.exports = router;
