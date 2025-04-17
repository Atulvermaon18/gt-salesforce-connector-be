const axios = require('axios');
const SalesforceToken = require('../models/salesforceOrgModel.js');
const asyncHandler = require('express-async-handler');
const {exchangeAuthCodeForToken,salesforceApiRequest} = require('../salesforceServices/tokenServices.js');
const Company = require('../models/companyModel');
const SalesforceOrg = require('../models/salesforceOrgModel');
const User = require('../models/userModel.js');

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
    const { environment, rootOrgName } = req.query;
    
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
    
    const stateData = {
      environment: environment,
      rootOrgName: rootOrgName
    };
    
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');
    
    // Construct the authorization URL with the state parameter
    const authUrl = `${baseURL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${encodeURIComponent(state)}`;

    
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
        const { authCode, environment, rootOrgName } = req.body;

        let baseURL = "";

        if (environment.toLowerCase() === "production") {
            baseURL = process.env.SALESFORCE_PROD_URL;
        } else if (environment.toLowerCase() === "sandbox") {
            baseURL = process.env.SALESFORCE_SANDBOX_URL;
        } else {
            const error = new Error("Invalid environment");
            error.errorCode = "MW_019";
            throw error;
        }

        // Exchange the auth code for a token
        const response = await exchangeAuthCodeForToken(authCode, baseURL);
        const tokenData = response;

        // // Call getOrgDetails to fetch organization details
        // const config = {
        //     method: 'get',
        //     url: `${tokenData.instance_url}/services/data/v59.0/sobjects/Organization/${tokenData.id.split('/')[4]}`,
        // };
        // const orgDetails = await salesforceApiRequest(config, tokenData);

        // Save the company to the database
        let company = await Company.findOne({ name: rootOrgName });
        if (!company) {
            company = await Company.create({ name: rootOrgName });
        }

        // Save the Salesforce org details to the database
        const salesforceOrg = new SalesforceOrg({
            orgId: tokenData.id.split('/')[4], // Extract orgId from the ID URL
            companyId: company._id,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            idtoken: tokenData.id_token,
            instanceUrl: tokenData.instance_url,
            issuedAt: new Date(parseInt(tokenData.issued_at)),
            tokenType: tokenData.token_type,
            environment: environment.toLowerCase(),
            sfUserId: tokenData.id.split('/')[3], // Extract sfUserId from the ID URL
            identityUrl: tokenData.id,
            // orgName_sf:orgDetails.Name
        });
        await salesforceOrg.save();

        // Associate the user with the company and org ID
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Link the user to the company
        user.companyId = company._id;

        // Add the org ID to the user's orgIds array if not already present
        if (!user.orgIds.includes(salesforceOrg._id)) {
            user.orgIds.push(salesforceOrg._id);
        }
        await user.save();
        return res.json({
            success: true,
            message: "Salesforce connection successful"
        });
        
    } catch (error) {
        console.error("Error while exchanging auth code:", error.response?.data || error.message);
        return res.status(500).json({
            message: "Error while exchanging auth code",
        });
    }
});

exports.salesforceGetContactsByOrgId = asyncHandler(async (req, res) => {
    try {
        const user = req.user // Get the user ID from the request

        // Ensure the user has at least one associated orgId
        if (!user.orgIds || user.orgIds.length === 0) {
            return res.status(400).json({ message: 'No associated Salesforce orgs found for the user' });
        }

        const allContacts = {}; // Object to store contacts for each orgId

        // Loop through each orgId and fetch contacts
        for (const org of user.orgIds) {
            try {
                // Fetch the Salesforce token for the orgId
                const token = await SalesforceToken.findOne({ orgId: org._id }).sort({ updatedAt: -1 });
                if (!token) {
                    allContacts[org.orgId] = { error: 'No Salesforce connection found for this orgId' };
                    continue;
                }

                // Query to fetch contacts
                const query = 'SELECT Id, FirstName, LastName, Email FROM Contact';
                const config = {
                    method: 'get',
                    url: `${token.instanceUrl}/services/data/v56.0/query`,
                    params: { q: query },
                };

                // Fetch contacts from Salesforce
                const contacts = await salesforceApiRequest(config, token);
                allContacts[org.orgId] = contacts.records; // Store contacts for this orgId
            } catch (error) {
                console.error(`Error fetching contacts for orgId ${org._id}:`, error.message);
                allContacts[org.orgId] = { error: error.message }; // Log errors for specific orgIds
            }
        }
        // Return all contacts for all orgIds
        res.status(200).json(allContacts);
    } catch (error) {
        console.error("Error fetching Salesforce contacts:", error.message);
        res.status(500).json({ message: "Error fetching Salesforce contacts" });
    }
});

exports.salesforceCreateConatactsByOrgId = asyncHandler(async (req, res) => {
    try {
        const { orgId, contacts } = req.body; // Get the orgId and contacts from the request body

        // Fetch the Salesforce token for the orgId
        const token = await SalesforceToken.findOne({ orgId }).sort({ updatedAt: -1 });
        if (!token) {
            return res.status(401).json({ message: 'No Salesforce connection found for this orgId' });
        }

        // Loop through each contact and create it in Salesforce
        const createdContacts = [];
        for (const contact of contacts) {
            const config = {
                method: 'post',
                url: `${token.instanceUrl}/services/data/v56.0/sobjects/Contact`,
                data: contact,
            };

            // Create contact in Salesforce
            const createdContact = await salesforceApiRequest(config, token);
            createdContacts.push(createdContact);
        }

        // Return the created contacts
        res.status(201).json(createdContacts);
    } catch (error) {
        console.error("Error creating Salesforce contacts:", error.message);
        res.status(500).json({ message: "Error creating Salesforce contacts" });
    }
});

exports.salesforceDescribe = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id; // Get the user ID from the request
        const token = await SalesforceToken.findOne({ userId }).sort({ updatedAt: -1 });

        if (!token) {
            return res.status(401).json({ message: 'No Salesforce connection found. Please authenticate first.' });
        }

        const config = {
            method: 'get',
            url: `${token.instanceUrl}/services/data/v56.0/sobjects/Contact/describe`,
        };

        const objectDescription = await salesforceApiRequest(config, token, userId);
        res.status(200).json(objectDescription);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

//@desc     Get list of Salesforce connections for a company
//@route    GET /api/salesforce/company-connections
//@access   Private/Admin
exports.getOrgConnections = asyncHandler(async (req, res) => {
    try {
        const admin = req.user; // Get the admin's user ID from the request

        // Fetch all Salesforce connections for the admin's company
        const connections = await SalesforceOrg.find({ companyId: admin.companyId }).populate('companyId', 'name');

        if (!connections || connections.length === 0) {
            return res.status(404).json({ message: "No Salesforce connections found for this company" });
        }

        // Return the list of connections
        res.status(200).json({
            company: admin.companyId,
            connections: connections.map(connection => ({
                orgId: connection.orgId,
                environment: connection.environment,
                instanceUrl: connection.instanceUrl,
                issuedAt: connection.issuedAt,
                sfUserId: connection.sfUserId,
                orgName: connection.orgName_sf,
                status: connection.status,
            })),
        });
    } catch (error) {
        console.error("Error fetching company connections:", error.message);
        res.status(500).json({ message: "Error fetching company connections" });
    }
});



