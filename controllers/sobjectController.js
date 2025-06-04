const createError = require('http-errors');
const SObject = require('../models/sobjectModel');
const Permission = require('../models/permissionModel');
const axios = require('axios');
const SalesforceToken = require('../models/salesforceOrgModel.js');
const { exchangeAuthCodeForToken, salesforceApiRequest } = require('../salesforceServices/tokenServices.js');

// Get all sObjects - fetch from DB first, if empty then get from Salesforce API
exports.getSObjects = async (req, res, next) => {
  try {
    // First try to get from DB
    let sObjects = await SObject.find().lean();

    // If DB is empty, fetch from Salesforce API
    if (sObjects.length === 0) {
      const { orgId } = req.query;
      if (!orgId) {
        return res.status(400).json({ message: 'orgId is required' });
      }
      const org = await SalesforceToken.findOne({ orgId });
      if (!org) {
        return res.status(404).json({ message: 'Salesforce org not found' });
      }

      const config = {
        method: 'get',
        url: `${org.instanceUrl}/services/data/v57.0/sobjects/`,
      };

      const response = await salesforceApiRequest(config, org);

      const sfObjects = response.sobjects || [];
      // Save the objects to the database
      const objectsToSave = sfObjects.filter(obj => {
        if (!obj.label.includes('MISSING LABEL')) {
          return {
            name: obj.name,
            label: obj.label,
            keyPrefix: obj.keyPrefix,
            labelPlural: obj.labelPlural,
            fields: [],
            metadata: JSON.stringify(obj)
          }
        }
      });

      if (objectsToSave.length > 0) {
        await SObject.insertMany(objectsToSave);
      }

      // Get the saved objects back from DB
      sObjects = await SObject.find().sort({ name: 1 }).lean();
    }

    // // Filter objects based on user permissions if needed
    // if (!req.user.isAdmin && req.user.role) {
    //   const userPermissions = req.user.role.flatMap(role => 
    //     role.permissions ? role.permissions.map(p => p._id.toString()) : []
    //   );

    //   sObjects = sObjects.filter(obj => 
    //     !obj.permissionId || userPermissions.includes(obj.permissionId.toString())
    //   );
    // }

    res.json({ success: true, data: sObjects });
  } catch (error) {
    next(error);
  }
};

// Get sObject with fields by name
exports.getSObjectWithFields = async (req, res, next) => {
  try {
    const { sobjectName } = req.params;

    // Try to find the sObject in DB
    let sObject = await SObject.findOne({ name: sobjectName }).lean();

    if (!sObject) {
      // sObject not found in DB, fetch from Salesforce
      const { orgId } = req.query;
      if (!orgId) {
        return res.status(400).json({ message: 'orgId is required' });
      }
      const org = await SalesforceToken.findOne({ orgId });
      if (!org) {
        return res.status(404).json({ message: 'Salesforce org not found' });
      }

      const config = {
        method: 'get',
        url: `${org.instanceUrl}/services/data/v57.0/sobjects/${sobjectName}/describe/`,
      };

      const response = await salesforceApiRequest(config, org);
      const sfObjectData = response;

      // Create new sObject with embedded fields
      sObject = new SObject({
        name: sfObjectData.name,
        label: sfObjectData.label,
        keyPrefix: sfObjectData.keyPrefix,
        labelPlural: sfObjectData.labelPlural,
        fields: sfObjectData.fields.map(field => ({
          name: field.name,
          label: field.label,
          type: field.type,
          soapType: field.soapType,
          length: field.length,
          byteLength: field.byteLength,
          precision: field.precision,
          scale: field.scale,
          custom: field.custom,
          metadata: JSON.stringify(field)
        })),
        metadata: JSON.stringify(sfObjectData)
      });

      await sObject.save();
      // Get fresh copy with lean()
      sObject = await SObject.findOne({ name: sobjectName }).lean();
    } else if (!sObject.fields || sObject.fields.length === 0) {
      // sObject exists but has no fields, fetch them from Salesforce
      const { orgId } = req.query;
      if (!orgId) {
        return res.status(400).json({ message: 'orgId is required' });
      }
      const org = await SalesforceToken.findOne({ orgId });
      if (!org) {
        return res.status(404).json({ message: 'Salesforce org not found' });
      }

      const config = {
        method: 'get',
        url: `${org.instanceUrl}/services/data/v57.0/sobjects/${sobjectName}/describe/`,
      };

      const response = await salesforceApiRequest(config, org);
      const sfObjectData = response;

      // Add fields to existing sObject
      sObject.fields = sfObjectData.fields.map(field => ({
        name: field.name,
        label: field.label,
        type: field.type,
        soapType: field.soapType,
        length: field.length,
        byteLength: field.byteLength,
        precision: field.precision,
        scale: field.scale,
        custom: field.custom,
        metadata: JSON.stringify(field)
      }));

      await SObject.updateOne(
        { _id: sObject._id },
        { $set: { fields: sObject.fields } }
      );

      // Get fresh copy with fields
      sObject = await SObject.findOne({ name: sobjectName }).lean();
    }

    res.json({
      success: true,
      data: {
        sobject: {
          _id: sObject._id,
          name: sObject.name,
          label: sObject.label,
          keyPrefix: sObject.keyPrefix,
          labelPlural: sObject.labelPlural,
          permissionId: sObject.permissionId
        },
        fields: sObject.fields || []
      }
    });
  } catch (error) {
    next(error);
  }
};

// Save sObject permission mapping
exports.saveSObjectPermission = async (req, res, next) => {
  try {
    const { sobjectName, permissionId } = req.body;

    if (!sobjectName) {
      return next(createError(400, 'sObject name is required'));
    }

    // Validate permission if provided
    // if (permissionId) {
    //   const permissionExists = await Permission.exists({ _id: permissionId });
    //   if (!permissionExists) {
    //     return next(createError(400, 'Invalid permission ID'));
    //   }
    // }

    // Find and update the sObject
    const updatedSObject = await SObject.findOneAndUpdate(
      { name: sobjectName },
      { permissionId: permissionId },
      { new: true }
    );

    if (!updatedSObject) {
      return next(createError(404, 'sObject not found'));
    }

    res.json({
      success: true,
      message: 'Permission updated successfully',
      data: updatedSObject
    });
  } catch (error) {
    next(error);
  }
};

// Save field permission mapping
exports.saveFieldPermission = async (req, res, next) => {
  try {
    const { sobjectName, fieldName, permissionId } = req.body;

    if (!sobjectName || !fieldName) {
      return next(createError(400, 'sObject name and field name are required'));
    }

    // Validate permission if provided
    if (permissionId) {
      const permissionExists = await Permission.exists({ _id: permissionId });
      if (!permissionExists) {
        return next(createError(400, 'Invalid permission ID'));
      }
    }

    // Find the sObject
    const sObject = await SObject.findOne({ name: sobjectName });
    if (!sObject) {
      return next(createError(404, 'sObject not found'));
    }

    // Find the field in the embedded array
    const fieldIndex = sObject.fields.findIndex(field => field.name === fieldName);
    if (fieldIndex === -1) {
      return next(createError(404, 'Field not found'));
    }

    // Update the field's permissionId
    sObject.fields[fieldIndex].permissionId = permissionId || null;
    await sObject.save();

    res.json({
      success: true,
      message: 'Permission updated successfully',
      data: sObject.fields[fieldIndex]
    });
  } catch (error) {
    next(error);
  }
};

// Batch save field permissions
exports.batchSaveFieldPermissions = async (req, res, next) => {
  try {
    const { sobjectName, fields } = req.body;

    if (!sobjectName || !fields || !Array.isArray(fields)) {
      return next(createError(400, 'sObject name and fields array are required'));
    }

    // Find the sObject
    const sObject = await SObject.findOne({ name: sobjectName });
    if (!sObject) {
      return next(createError(404, 'sObject not found'));
    }

    // Process each field update
    const results = [];
    const updateOperations = [];

    for (const fieldUpdate of fields) {
      if (!fieldUpdate.name) continue;

      // Validate permission if provided
      if (fieldUpdate.permissionId) {
        const permissionExists = await Permission.exists({ _id: fieldUpdate.permissionId });
        if (!permissionExists) {
          continue; // Skip invalid permissions
        }
      }

      // Find the field in the embedded array
      const fieldIndex = sObject.fields.findIndex(field => field.name === fieldUpdate.name);
      if (fieldIndex !== -1) {
        // Update the field's permissionId
        sObject.fields[fieldIndex].permissionId = fieldUpdate.permissionId || null;
        results.push(sObject.fields[fieldIndex]);
      }
    }

    // Save the updated sObject with modified fields
    await sObject.save();

    res.json({
      success: true,
      message: 'Permissions updated successfully',
      data: results
    });
  } catch (error) {
    next(error);
  }
};

// Get specific record by ID
exports.getSObjectRecordById = async (req, res, next) => {
  try {
    const { sobjectName, recordId } = req.params;
    const { orgId } = req.query;
    
    if (!orgId) {
      return res.status(400).json({ message: 'orgId is required' });
    }
    
    // Get sObject from our database
    const sObject = await SObject.findOne({ name: sobjectName });
    
    // If sObject not found in our database, we can't determine field permissions
    if (!sObject) {
      return res.status(404).json({ message: `SObject "${sobjectName}" not found in permission mappings` });
    }
    
    // Check if user has permission to access this sObject
    // Permission check code would go here if needed
    
    // Get org access token
    const org = await SalesforceToken.findOne({ orgId });
    if (!org) {
      return res.status(404).json({ message: 'Salesforce org not found' });
    }
    
    // Filter fields based on user permissions
    // For now, just use all fields
    const accessibleFields = sObject.fields.map(field => ({
      name: field.name,
      label: field.label,
      type: field.type
    }));
    
    if (accessibleFields.length === 0) {
      return res.status(403).json({ message: 'No fields available for this sObject' });
    }
    
    // Construct SOQL query with fields
    const fieldNames = accessibleFields.map(f => f.name).join(', ');
    const soql = `SELECT ${fieldNames} FROM ${sobjectName} WHERE Id = '${recordId}'`;
    
    // Query Salesforce
    const config = {
      method: 'get',
      url: `${org.instanceUrl}/services/data/v57.0/query/`,
      params: { q: soql }
    };
    
    const response = await salesforceApiRequest(config, org);
    
    if (!response.records || response.records.length === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }
    
    res.json({
      success: true,
      data: response.records[0],
      accessibleFields
    });
  } catch (error) {
    next(error);
  }
}; 