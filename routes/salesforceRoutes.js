const express = require("express");
const { exchangeAuthCode,
    generateAuthUrl,
    getConnectionStatus,
    salesforceGetObjectByOrgId,
    salesforceDescribe,
    salesforceGetObjectCount,
    getOrgConnections,
    salesforceGetObjectById,
    salesforceCreateObjectByOrgId ,getRelatedObjects,getRelatedObjectRecords,objectFieldValues} = require("../controllers/salesforceController.js");
const { authorizePermission, protect } = require('../middlewares/authHandler.js');
const { getSalesforceApps, getSalesforceAppById } = require('../controllers/salesforceController.js');

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
router.get("/relatedObjects",  getRelatedObjects);
router.get("/relatedObjectRecords",  getRelatedObjectRecords);
router.get("/objectFieldValues",   objectFieldValues);

module.exports = router;
