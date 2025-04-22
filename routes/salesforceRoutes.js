const express = require("express");
const { exchangeAuthCode,
    generateAuthUrl,
    getConnectionStatus,
    salesforceGetObjectByOrgId,
    salesforceDescribe,
    salesforceGetObjectCount,
    getOrgConnections,
    salesforceCreateObjectByOrgId } = require("../controllers/salesforceController.js");
const { authorizePermission, protect } = require('../middlewares/authHandler.js');
const { getSalesforceApps, getSalesforceAppById } = require('../controllers/salesforceController.js');

const router = express.Router();

router.get("/auth-url", protect, authorizePermission("SETTINGS"), generateAuthUrl);
router.post("/exchangeAuthCode", protect, authorizePermission("SETTINGS"), exchangeAuthCode);
router.get("/connection-status", protect, authorizePermission("SETTINGS"), getConnectionStatus);
router.get("/objectList", protect, authorizePermission("SETTINGS"), salesforceGetObjectByOrgId);
router.get("/objectCount", protect, authorizePermission("SETTINGS"), salesforceGetObjectCount);
router.get("/retriveOrg", protect, authorizePermission("SETTINGS"), getOrgConnections);
router.get("/describe", protect, authorizePermission("SETTINGS"), salesforceDescribe);
router.post("/createObject", protect, authorizePermission("SETTINGS"), salesforceCreateObjectByOrgId);
router.get("/getSalesforceApps", protect, authorizePermission("SETTINGS"), getSalesforceApps);
router.get("/getSalesforceAppById", protect, authorizePermission("SETTINGS"), getSalesforceAppById);

module.exports = router;
