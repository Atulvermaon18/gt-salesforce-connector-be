const axios = require('axios');
const qs = require('qs');
const SalesforceToken = require('../models/salesforceOrgModel.js'); // Import your token model

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
const getNewTokens = async (refreshToken, environment) => {
    try {
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

/**
 * Reusable function to handle Salesforce API requests with retry logic.
 * @param {Object} config - Axios request configuration.
 * @param {Object} token - The Salesforce token object containing accessToken, refreshToken, etc.
 * @param {string} userId - The ID of the user making the request.
 * @returns {Promise<Object>} - The response from the Salesforce API.
 */
const salesforceApiRequest = async (config, token) => {
    try {
        // Add Authorization header to the request
        config.headers = {
            ...config.headers,
            Authorization: `Bearer ${token.accessToken}`,
        };

        // Make the initial request
        const response = await axios.request(config);
        return response.data;
    } catch (error) {
        console.error('Error making Salesforce API request:', error.response?.data || error.message);
        // Handle 401 Unauthorized error
        if (error.response?.status === 401) {
            console.log('Access token expired. Attempting to refresh the token...');
            const newTokenData = await getNewTokens(token.refreshToken, token.environment);

            // Update the token in the database
            await SalesforceToken.findOneAndUpdate(
                { orgId: token.orgId },
                {
                    accessToken: newTokenData.access_token,
                    instanceUrl: newTokenData.instance_url,
                    refreshToken: newTokenData.refresh_token,
                    idToken: newTokenData.id_token,
                    issuedAt: new Date(parseInt(newTokenData.issued_at)),
                    tokenType: newTokenData.token_type,
                },
                { new: true, upsert: true }
            );

            // Retry the request with the new access token
            config.headers.Authorization = `Bearer ${newTokenData.access_token}`;
            const retryResponse = await axios.request(config);
            retryResponse.data.newAccessToken = newTokenData.access_token; // Add new access token to response
            retryResponse.data.newRefreshToken = newTokenData.refresh_token; // Add new refresh token to response
            retryResponse.data.newIdToken = newTokenData.id_token; // Add new id token to response
            retryResponse.data.newIssuedAt = new Date(parseInt(newTokenData.issued_at)); // Add new issued at to response
            return retryResponse.data;
        }

        // Handle other error codes
        if (error.response?.status === 403) {
            throw new Error('Forbidden: Access denied to the requested resource');
        }
        if (error.response?.status === 404) {
            throw new Error('Not Found: The requested resource does not exist');
        }
        if (error.response?.status === 500) {
            throw new Error('Internal Server Error: Salesforce server issue');
        }
        if (error.response?.status === 503) {
            throw new Error('Service Unavailable: Salesforce service is temporarily unavailable');
        }
        if (error.response?.status === 429) {
            throw new Error('Too Many Requests: Rate limit exceeded');
        }
        if (error.response?.status === 400) {
            throw new Error('Bad Request: Invalid request parameters');
        }

        // Throw a generic error if no specific status code is matched
        throw new Error(
            error.response?.data?.error_description || 'Failed to make Salesforce API request'
        );
    }
};

const n8nSalesforceApiRequest = async (config) => {
    try {
      const response = await axios.request(config)
      
      return response.data;
    } catch (error) {
        console.error('Error making Salesforce API request:', error.response?.data || error.message);
        throw new Error(
            error.response?.data?.error_description || 'Failed to make Salesforce API request'
        );
    }
}
module.exports = {
    exchangeAuthCodeForToken,
    getNewTokens,
    salesforceApiRequest,
    n8nSalesforceApiRequest
};