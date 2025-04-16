const axios = require('axios');
const SalesforceToken = require('../models/salesforceTokenModel.js');
const asyncHandler = require('express-async-handler');
const qs = require('qs');

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
                'client_secret': process.env.SALESFORCE_SECRET_ID,
                'code': authCode,
            }
        };
        console.log(config.data);
        const response = await axios.request(config);
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