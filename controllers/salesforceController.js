const axios = require('axios');
const SalesforceToken = require('../models/salesforceOrgModel.js');
const asyncHandler = require('express-async-handler');
const { exchangeAuthCodeForToken, salesforceApiRequest,n8nSalesforceApiRequest } = require('../salesforceServices/tokenServices.js');
const Company = require('../models/companyModel');
const SalesforceOrg = require('../models/salesforceOrgModel');
const User = require('../models/userModel.js');
const SObject = require('../models/sobjectModel');

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
    const { authCode, environment, rootOrgName, id } = req.body;

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

    // Save the company to the database
    let company = await Company.findOne({ name: rootOrgName });
    if (!company) {
      company = await Company.create({ name: rootOrgName });
    }
    await SalesforceOrg.deleteMany({});
    // Save the Salesforce org details to the database
    const salesforceOrg = new SalesforceOrg({
      orgId: tokenData.id.split('/')[4], // Extract orgId from the ID URL
      companyId: company._id,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || '',
      idtoken: tokenData.id_token,
      instanceUrl: tokenData.instance_url,
      issuedAt: new Date(parseInt(tokenData.issued_at)),
      tokenType: tokenData.token_type,
      environment: environment.toLowerCase(),
      sfUserId: tokenData.id.split('/')[3], // Extract sfUserId from the ID URL
      identityUrl: tokenData.id,
      // orgName_sf:orgDetails.Name
    });


    const savedSalesforceOrg = await salesforceOrg.save();

    // Call getOrgDetails to fetch organization details
    // const config = {
    //   method: 'get',
    //   url: `${tokenData.instance_url}/services/data/v59.0/sobjects/Organization/${tokenData.id.split('/')[4]}`,
    // };
    // const orgDetails = await salesforceApiRequest(config, tokenData);

    // Associate the user with the company and org ID
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Link the user to the company
    user.companyId = company._id;
    // Add the org ID to the user's orgIds array if not already present
    if (!user?.orgIds?.includes(savedSalesforceOrg.orgId)) {
      user.orgIds.push(savedSalesforceOrg.orgId);
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

//@desc     Get contacts from Salesforce
//@route    GET /api/salesforce/objectList
//@access   Private
exports.salesforceGetObjectByOrgId = asyncHandler(async (req, res) => {
  try {
    const { objectApiName, orgId, page, limit, sortField, sortDirection } = req.query;

    if (!orgId) {
      return res.status(400).json({ message: 'orgId is required' });
    }
    const org = await SalesforceToken.findOne({ orgId });
    if (!org) {
      return res.status(404).json({ message: 'Salesforce org not found' });
    }

    // Get user permissions
    const userPermissions = extractUserPermissions(req.user);

    // Get the sObject from our database to check field permissions
    const SObject = require('../models/sobjectModel');
    const sobject = await SObject.findOne({ name: objectApiName });

    // Determine which fields the user can access
    let fieldsClause = 'FIELDS(ALL)';
    if (sobject && sobject.fields && sobject.fields.length > 0) {
      // Filter fields based on permissions
      const accessibleFields = sobject.fields
      // .filter(field =>
      //   // Only include fields that the user has permission to access
      //   field.permissionId && userPermissions.includes(field.permissionId.toString())
      // );

      if (accessibleFields.length > 0) {
        // Use only accessible fields in the query
        fieldsClause = accessibleFields.map(field => field.name).join(',');
      } else {
        // If no fields are accessible, return empty array
        return res.json([]);
      }
      // fieldsClause = 'Id,' + fieldsClause
    }
    const query = `SELECT ${fieldsClause} FROM ${objectApiName} ORDER BY ${sortField || 'Id'} ${sortDirection || 'ASC'} LIMIT ${limit || 100} OFFSET ${((page || 1) - 1) * (limit || 100)}`;
    
    const apiResponse = await n8nSalesforceApiRequest({
      method: 'post',
      url: process.env.N8N_URL,
      endpoint:"query",
      data: { query: query ,
         endpoint:"query"
      },
    });
    return res.json(apiResponse);
  
  } catch (error) {
    console.error("Error fetching Salesforce objects:", error.message);
    res.status(500).json({ message: "Error fetching Salesforce objects" });
  }
});

//@desc     Get contacts from Salesforce
//@route    GET /api/salesforce/objectCount
//@access   Private
exports.salesforceGetObjectCount = asyncHandler(async (req, res) => {
  try {
    const { objectApiName, orgId } = req.query;

    if (!orgId) {
      return res.status(400).json({ message: 'orgId is required' });
    }
    const org = await SalesforceToken.findOne({ orgId });
    if (!org) {
      return res.status(404).json({ message: 'Salesforce org not found' });
    }

    try {
      const config = {
        method: 'get',
        url: `${org.instanceUrl}/services/data/v57.0/limits/recordCount?sObjects=${objectApiName}`,
      };

      // Fetch contacts from Salesforce
      const count = await salesforceApiRequest(config, org);

      return res.json(count);
    } catch (error) {
      console.error(`Error fetching count:`, error.message);
      return res.status(500).json({ message: "Error fetching Salesforce count" });
    }
  } catch (error) {
    console.error("Error fetching Salesforce contacts:", error.message);
    res.status(500).json({ message: "Error fetching Salesforce contacts" });
  }
});

//@desc     Create a new object in Salesforce
//@route    POST /api/salesforce/createObject
//@access   Private
exports.salesforceCreateObjectByOrgId = asyncHandler(async (req, res) => {
  try {
    const { orgId, objectApiName, objectData } = req.body; // Get the orgId and contacts from the request body

    // Fetch the Salesforce token for the orgId
    const token = await SalesforceToken.findOne({ orgId }).sort({ updatedAt: -1 });
    if (!token) {
      return res.status(401).json({ message: 'No Salesforce connection found for this orgId' });
    }

    // Loop through each contact and create it in Salesforce
    const createdObject = [];
    for (const object of objectData) {
      const config = {
        method: 'post',
        url: `${token.instanceUrl}/services/data/v57.0/sobjects/${objectApiName}`,
        body: object,
      };
      console.log(config.url);
      // Create contact in Salesforce
      const createdObject = await salesforceApiRequest(config, token);
      if (createdObject.newAccessToken) {
        token.accessToken = createdObject.newAccessToken;
        token.refreshToken = createdObject.newRefreshToken
        token.idToken = createdObject.newIdToken // Update the token with the new access token
      }

      createdObject.push(createdObject);
    }

    // Return the created contacts
    return res.json(createdObject);
  } catch (error) {
    console.error("Error creating Salesforce contacts:", error.message);
    return res.status(500).json({ message: "Error creating Salesforce contacts" });
  }
});

//@desc     Get a specific object in Salesforce
//@route    GET /api/salesforce/getObjectById
//@access   Private
exports.salesforceGetObjectById = asyncHandler(async (req, res) => {
  try {
    const { orgId, objectApiName, objectId } = req.query;

    // Fetch the Salesforce token for the orgId
    const token = await SalesforceToken.findOne({ orgId }).sort({ updatedAt: -1 });
    if (!token) {
      return res.status(401).json({ message: 'No Salesforce connection found for this orgId' });
    }

    // Get user permissions
    const userPermissions = extractUserPermissions(req.user);

    // Get the sObject from our database to check field permissions
    const SObject = require('../models/sobjectModel');
    const sobject = await SObject.findOne({ name: objectApiName });

    // Determine which fields the user can access
    let fieldList = '*';
    if (sobject && sobject.fields && sobject.fields.length > 0) {
      // Filter fields based on permissions
      const accessibleFields = sobject.fields
      // .filter(field =>
      //   // Only include fields that the user has permission to access
      //   field.permissionId && userPermissions.includes(field.permissionId.toString())
      // );

      if (accessibleFields.length > 0) {
        // Use only accessible fields in the query
        fieldList = accessibleFields.map(field => field.name).join(',');
      } else {
        // If no fields are accessible, return empty record
        return res.json({});
      }
      // fieldList = 'Id,' + fieldList
    }
    const query = `SELECT ${fieldList} FROM ${objectApiName} WHERE Id = '${objectId}'`;
    // console.log(query);
    const apiResponse = await n8nSalesforceApiRequest({
      method: 'post',
      url: process.env.N8N_URL,
      data: { query: query, 
         endpoint:"query"
      },
    });
    return res.json(apiResponse);
 
  } catch (error) {
    console.error("Error retrieving Salesforce object:", error.message);
    return res.status(500).json({ message: "Error retrieving Salesforce object" });
  }
});

// Helper function to extract user permissions
function extractUserPermissions(user) {
  if (!user || !user.role) return [];

  const permissions = [];
  if (Array.isArray(user.role)) {
    user.role.forEach(role => {
      if (role.permissions && Array.isArray(role.permissions)) {
        role.permissions.forEach(permission => {
          permissions.push(permission._id.toString());
        });
      }
    });
  }

  return permissions;
}

exports.salesforceDescribe = asyncHandler(async (req, res) => {
  try {
    const { objectApiName, orgId } = req.query;
    if (!orgId) {
      return res.status(400).json({ message: 'orgId is required' });
    }
    const org = await SalesforceToken.findOne({ orgId });
    if (!org) {
      return res.status(404).json({ message: 'Salesforce org not found' });
    }

    const config = {
      method: 'get',
      url: `${org.instanceUrl}/services/data/v57.0/sobjects/${objectApiName}/describe`,
    };

    const objectDescription = await salesforceApiRequest(config, org);
    delete objectDescription.childRelationships;
    delete objectDescription.urls;
    res.status(200).json(objectDescription);
  } catch (error) {
    console.error("Error fetching Salesforce object description:", error.message);
    res.status(500).json({ message: "Error fetching Salesforce object description" });
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

//@desc     Get list of Salesforce apps for a user
//@route    GET /api/salesforce/getSalesforceApps
//@access   Private
exports.getSalesforceApps = asyncHandler(async (req, res) => {
  try {
    const { orgId } = req.query;
    if (!orgId) {
      return res.status(400).json({ message: 'orgId is required' });
    }
    const org = await SalesforceOrg.findOne({ orgId });
    if (!org) {
      return res.status(404).json({ message: 'Salesforce org not found' });
    }
    const url = `${org.instanceUrl}/services/data/v57.0/ui-api/apps?formFactor=Large`;
    payload = {
      "url":url,
      "method": "GET",
      "body": {},
      "endpoint":"record"
    }
    const axiosConfig = {
      method: 'post',
      url: process.env.N8N_URL,
      headers: {
        'Content-Type': 'application/json',
      },
   data: payload
    };
    const response = await n8nSalesforceApiRequest(axiosConfig);
   
    res.status(200).json(response[0]);
  } catch (error) {
    console.error('Error fetching Salesforce apps:', error.message);
    res.status(500).json({ message: 'Error fetching Salesforce apps', error: error.message });
  }
});

//@desc     Get a specific Salesforce app by appId for a user/org
//@route    GET /api/salesforce/getSalesforceAppById
//@access   Private
exports.getSalesforceAppById = asyncHandler(async (req, res) => {
  try {
    const { orgId, appId } = req.query;
    if (!orgId || !appId) {
      return res.status(400).json({ message: 'orgId and appId are required' });
    }
    const org = await SalesforceToken.findOne({ orgId });
    if (!org) {
      return res.status(404).json({ message: 'Salesforce org not found' });
    }
    const url = `${org.instanceUrl}/services/data/v57.0/ui-api/apps/${appId}?formFactor=Large`;
 
    payload = {
      "url":url,
      "method": "GET",
      "endpoint":"record",
      "body": {}
    }
    const axiosConfig = {
      method: 'post',
      url: process.env.N8N_URL,
      headers: {
        'Content-Type': 'application/json',
      },
   data: payload
    };
    const response = await n8nSalesforceApiRequest(axiosConfig);
    // Get the app data
    const appData = response[0];

    // Get user from request
    const user = req.user;

    // If there are navigation items and the user isn't an admin, filter them
    if (appData.navItems && appData.navItems.length > 0 && user && !user.isAdmin) {
      // Extract user permissions from the roles
      const userPermissions = [];
      if (user.role && Array.isArray(user.role)) {
        user.role.forEach(role => {
          if (role.permissions && Array.isArray(role.permissions)) {
            role.permissions.forEach(permission => {
              userPermissions.push(permission._id.toString());
            });
          }
        });
      }

      // Filter navItems based on object permissions
      const filteredNavItems = [];

      for (const navItem of appData.navItems) {
        if (navItem.objectApiName) {
          // Look up the object in our database
          const sobject = await SObject.findOne({ name: navItem.objectApiName });

          // Only include if object exists in DB and user has required permission
          if (sobject && sobject.permissionId && userPermissions.includes(sobject.permissionId.toString())) {
            filteredNavItems.push(navItem);
          }
        } else {
          // If no objectApiName, include it by default (like Home)
          filteredNavItems.push(navItem);
        }
      }

      // Replace the nav items with the filtered list
      appData.navItems = filteredNavItems;
    }

    res.status(200).json(appData);
  } catch (error) {
    console.error('Error fetching Salesforce app:', error.message);
    res.status(500).json({ message: 'Error fetching Salesforce app', error: error.message });
  }
});

//@desc     Get related objects for a specific Salesforce object
//@route    GET /api/salesforce/relatedObjects
//@access   Private

exports.getRelatedObjects = asyncHandler(async (req,res)=>{
  try{
    const { orgId, objectApiName } = req.query;
    if(!orgId || !objectApiName) return res.status(400).json({ message: 'orgId and objectApiName are required' });
    const org=await SalesforceToken.findOne({ orgId });
    if (!org) {
      return res.status(404).json({ message: 'Salesforce org not found' });
    }
    const url = `${org.instanceUrl}/services/data/v57.0/ui-api/related-list-info/${objectApiName}`;
    payload = {
      "url":url,
      "method": "GET",
      "endpoint":"record",
      "body": {}
    }
    const axiosConfig = {
      method: 'post',
      url: process.env.N8N_URL,
      headers: {
        'Content-Type': 'application/json',
      },
   data: payload
    };
    const response = await n8nSalesforceApiRequest(axiosConfig);
    const relatedLists=response[0].relatedLists;
    // const childRels=response[0].childRelationships.filter(cr=>cr.deprecatedAndHidden==false)
  //   const query =  ` `
  //   const apiResponse = await n8nSalesforceApiRequest({
  //     method: 'post',
  //     url: process.env.N8N_URL,
  //     endpoint:"query",
  //     data: { query: query ,
  //        endpoint:"query"
  //     },
  //   });

  //   console.log(apiResponse);
  //  const res={
  //   childRelationships:response[0].childRelationships,
  //   records:apiResponse[0].records
  //  }
    res.status(200).json(relatedLists);
  } catch (error) {
    console.error('Error fetching related objects:', error.message);
    res.status(500).json({ message: 'Error fetching related objects', error: error.message });
  }
});



exports.getRelatedObjectRecords = asyncHandler(async (req,res)=>{
  try{
    const { orgId, relatedListId, objectId } = req.query;
    if(!orgId || !relatedListId || !objectId) return res.status(400).json({ message: 'orgId and relatedListId and objectId are required' });
    const org=await SalesforceToken.findOne({ orgId });
    if (!org) {
      return res.status(404).json({ message: 'Salesforce org not found' });
    }
    const url = `${org.instanceUrl}/services/data/v57.0/ui-api/related-list-records/${objectId}/${relatedListId}`; 
    payload = {
      "url":url,
      "method": "GET",
      "endpoint":"record",
      "body": {}
    }
    const axiosConfig = {
      method: 'post',
      url: process.env.N8N_URL,
      headers: {
        'Content-Type': 'application/json',
      },
   data: payload
    };
    const response = await n8nSalesforceApiRequest(axiosConfig);
    console.log(response);
    
    res.status(200).json(response[0]);
  } catch (error) {
    console.error('Error fetching related objects:', error.message);
    res.status(500).json({ message: 'Error fetching related objects', error: error.message });
  }
}); 