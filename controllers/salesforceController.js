const axios = require('axios');
const SalesforceToken = require('../models/salesforceTokenModel.js');
const asyncHandler = require('express-async-handler');



/**
 * Exchanges the Salesforce auth code for an access token.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
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

        const config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: baseURL,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            data: {
                'grant_type': process.env.SALESFORCE_GRANT_TYPE,
                'redirect_uri': process.env.SALESFORCE_CALLBACK_URL,
                'client_id': process.env.SALESFORCE_CLIENT_ID,
                'code': authCode,
            }
        };
        const response = await axios.request(config);
        const tokenData = response.data;

        // Save token data to the database
        const salesforceToken = new SalesforceToken({
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            instanceUrl: tokenData.instance_url,
            issuedAt: new Date(parseInt(tokenData.issued_at)),
            tokenType: tokenData.token_type,
            userId: tokenData.id.split('/').pop(), // Extract userId from the ID URL
            organizationId: tokenData.id.split('/')[4], // Extract orgId from the ID URL
            environment: environment.toLowerCase(),
        });
        await salesforceToken.save();
        return res.status(204);
    } catch (error) {
        console.log(error);
        const err = new Error("Error while exchanging auth code");
        return res.status(500).json({
            message: err,
        });
    }
});