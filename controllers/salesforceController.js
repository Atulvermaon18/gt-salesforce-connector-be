const axios = require('axios');
const SalesforceToken = require('../models/salesforceTokenModel.js');
const asyncHandler = require('express-async-handler');
const {exchangeAuthCodeForToken} = require('../salesforceServices/tokenServices.js')
//@desc     Check Salesforce connection status
//@route    GET /api/salesforce/connection-status
//@access   Private
exports.getConnectionStatus = asyncHandler(async (req, res) => {
  try {
    // Find the most recent token entry
    const latestToken = await SalesforceToken.findOne().sort({ updatedAt: -1 });
    
    if (!latestToken) {
      return res.json({
        connected: false,
        message: "No Salesforce connection found"
      });
    }
    
    // Check if token is still valid (tokens typically expire after some time)
    // This is a basic check - you might want to add more validation based on your needs
    const isValid = latestToken.issuedAt && new Date() - new Date(latestToken.issuedAt) < 7200000; // 2 hours in milliseconds
    
    return res.json({
      connected: isValid,
      environment: latestToken.environment,
      issuedAt: latestToken.issuedAt,
      organizationId: latestToken.organizationId
    });
    
  } catch (error) {
    console.error("Error checking connection status:", error);
    return res.status(500).json({
      message: "Error checking Salesforce connection status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

//@desc     Generate Salesforce authorization URL
//@route    GET /api/salesforce/auth-url
//@access   Public
exports.generateAuthUrl = asyncHandler(async (req, res) => {
  try {
    const { environment } = req.query;
    
    const clientId = process.env.SALESFORCE_CLIENT_ID;
    const redirectUri = process.env.SALESFORCE_CALLBACK_URL;
    
    if (!clientId || !redirectUri) {
      return res.status(500).json({
        message: "Missing configuration: Client ID or Redirect URI not set in environment variables",
      });
    }
    
    let baseURL = ""

    if (environment.toLowerCase() === "production") {
        baseURL = process.env.SALESFORCE_PROD_URL + "/services/oauth2/authorize"
    } else if (environment.toLowerCase() === "sandbox") {
        baseURL = process.env.SALESFORCE_SANDBOX_URL + "/services/oauth2/authorize"
    } else {
        const error = new Error("Invalid environment");
        error.errorCode = "MW_019";
        throw error;
    }
    
    // Construct the authorization URL
    const authUrl = `${baseURL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
    
    // Return the URL to the frontend
    return res.json({ authUrl });
    
  } catch (error) {
    console.error("Error generating auth URL:", error);
    return res.status(500).json({
      message: "Error generating Salesforce authorization URL",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

//@desc     Exchanges the Salesforce auth code for an access token.
//@route    POST /api/salesforce/exchangeAuthCode
//@access   Public
exports.exchangeAuthCode = asyncHandler(async (req, res) => {
    try {
        const {
            authCode,
            environment
        } = req.body

        let baseURL = ""

        if (environment.toLowerCase() === "production") {
            baseURL = process.env.SALESFORCE_PROD_URL
        } else if (environment.toLowerCase() === "sandbox") {
            baseURL = process.env.SALESFORCE_SANDBOX_URL
        } else {
            const error = new Error("Invalid environment");
            error.errorCode = "MW_019";
            throw error;
        }
        const response = await exchangeAuthCodeForToken(authCode, baseURL);
        const tokenData = response.data;
        // Save token data to the database
        const salesforceToken = new SalesforceToken({
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            idToken: tokenData.id_token,
            instanceUrl: tokenData.instance_url,
            issuedAt: new Date(parseInt(tokenData.issued_at)),
            tokenType: tokenData.token_type,
            sfUserId: tokenData.id.split('/').pop(), // Extract userId from the ID URL
            sfOrganizationId: tokenData.id.split('/')[4], // Extract orgId from the ID URL
            environment: environment.toLowerCase(),
            userId: req.user._id
        });
        await salesforceToken.save();
        return res.status(204).json({});
    } catch (error) {
        console.log(error.response.data);
        // const err = new Error("Error while exchanging auth code");
        return res.status(500).json({
            message: "Error while exchanging auth code",
        });
    }
});

exports.salesforceAllContacts = asyncHandler(async (req, res) => { 

});