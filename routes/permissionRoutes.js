const express = require("express");
const { getPermissions, createPermission, updatePermission, deletePermission } = require("../controllers/permissionController.js");
const { authorizePermission, protect } = require('../middlewares/authHandler.js');

const router = express.Router();

router.get("/", protect,authorizePermission('READ_PERMISSION'), getPermissions);
router.post("/",protect, authorizePermission('CREATE_PERMISSION'),createPermission);
router.put("/:permissionId", protect, authorizePermission('UPDATE_PERMISSION'),updatePermission);
router.delete("/:permissionId", protect, authorizePermission('DELETE_PERMISSION'),deletePermission);

module.exports = router;
