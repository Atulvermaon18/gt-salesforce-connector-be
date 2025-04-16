const express = require("express");
const { exchangeAuthCode, generateAuthUrl, getConnectionStatus } = require("../controllers/salesforceController.js");
const { authorizePermission, protect } = require('../middlewares/authHandler.js');

const router = express.Router();

router.get("/auth-url", protect, authorizePermission("SETTINGS"), generateAuthUrl);
router.post("/exchangeAuthCode", protect, authorizePermission("SETTINGS"), exchangeAuthCode);
router.get("/connection-status", protect, authorizePermission("SETTINGS"), getConnectionStatus);

module.exports = router;
