const express = require("express");
const { exchangeAuthCode } = require("../controllers/salesforceController.js");
const { authorizePermission, protect } = require('../middlewares/authHandler.js');

const router = express.Router();

router.post("/exchangeAuthCode",exchangeAuthCode);

module.exports = router;
