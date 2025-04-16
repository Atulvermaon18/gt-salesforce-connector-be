const axios = require('axios');
const qs = require('qs');

/**
 * Exchanges the Salesforce authorization code for an access token.
 * @param {string} authCode - The authorization code received from Salesforce.
 * @param {string} baseURL - The base URL for the Salesforce environment (production or sandbox).
 * @returns {Promise<Object>} - The response from Salesforce containing the access token and other details.
 */
const exchangeAuthCodeForToken = async (authCode, baseURL) => {
    try {
        // Configure the request
        const config = {
            method: 'post',
            maxBodyLength: Infinity,
            baseURL,
            url: process.env.SALESFORCE_OAUTH_URL,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            data: qs.stringify({
                'grant_type': process.env.SALESFORCE_GRANT_TYPE,
                'redirect_uri': process.env.SALESFORCE_CALLBACK_URL,
                'client_id': process.env.SALESFORCE_CLIENT_ID,
                'client_secret': process.env.SALESFORCE_SECRET_ID,
                'code': authCode,
            }),
        };

        // Make the request to Salesforce
        const response = await axios.request(config);

        // Return the response data
        return response.data;
    } catch (error) {
        // Log the error for debugging
        console.error('Error exchanging auth code for token:', error.response?.data || error.message);

        // Throw the error to be handled by the caller
        throw new Error(
            error.response?.data?.error_description || 'Failed to exchange auth code for token'
        );
    }
};

/**
 * Refreshes the Salesforce access token using the refresh token.
 * @param {string} refreshToken - The refresh token stored in the database.
 * @param {string} baseURL - The base URL for the Salesforce environment (production or sandbox).
 * @returns {Promise<Object>} - The response from Salesforce containing the new access token and other details.
 */
const getNewTokens = async (refreshToken, baseURL) => {
    try {
        // Configure the request
        const config = {
            method: 'post',
            maxBodyLength: Infinity,
            baseURL,
            url: process.env.SALESFORCE_OAUTH_URL,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            data: qs.stringify({
                'grant_type': 'refresh_token',
                'client_id': process.env.SALESFORCE_CLIENT_ID,
                'client_secret': process.env.SALESFORCE_SECRET_ID,
                'refresh_token': refreshToken,
            }),
        };

        // Make the request to Salesforce
        const response = await axios.request(config);

        // Return the response data
        return response.data;
    } catch (error) {
        // Log the error for debugging
        console.error('Error refreshing tokens:', error.response?.data || error.message);

        // Throw the error to be handled by the caller
        throw new Error(
            error.response?.data?.error_description || 'Failed to refresh tokens'
        );
    }
};

module.exports = {
    exchangeAuthCodeForToken,
    getNewTokens,
};