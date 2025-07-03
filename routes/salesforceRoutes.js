const express = require("express");
const { exchangeAuthCode,
    generateAuthUrl,
    getConnectionStatus,
    salesforceGetObjectByOrgId,
    salesforceDescribe,
    salesforceGetObjectCount,
    getOrgConnections,
    salesforceGetObjectById,
    salesforceCreateObjectByOrgId } = require("../controllers/salesforceController.js");
const { authorizePermission, protect } = require('../middlewares/authHandler.js');
const { getSalesforceApps, getSalesforceAppById, getContacts } = require('../controllers/salesforceController.js');

const router = express.Router();

router.get("/auth-url",   generateAuthUrl);
router.post("/exchangeAuthCode",   exchangeAuthCode);
router.get("/connection-status",   getConnectionStatus);
router.get("/objectList",   salesforceGetObjectByOrgId);
router.get("/objectCount",   salesforceGetObjectCount);
router.get("/retriveOrg",   getOrgConnections);
router.get("/describe",   salesforceDescribe);
router.post("/createObject",  salesforceCreateObjectByOrgId);
router.get("/getObjectById",  salesforceGetObjectById);
router.get("/getSalesforceApps",  getSalesforceApps);
router.get("/getSalesforceAppById",  getSalesforceAppById);
router.get("/getContacts",  getContacts);

module.exports = router;
