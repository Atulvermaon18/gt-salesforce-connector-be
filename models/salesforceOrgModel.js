const mongoose = require('mongoose');
const withBaseSchema = require('./baseSchema.js');

const salesforceOrgSchema = withBaseSchema({
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      required: true,
    },
    idtoken:{
        type: String,
        required: true,
    },
    instanceUrl: {
      type: String,
      required: true,
    },
    issuedAt: {
      type: Date,
      required: true,
    },
    tokenType: {
      type: String,
      required: true,
    },
    sfUserId: {
      type: String,
      required: true,
    },
    environment: {
      type: String,
      enum: ['production', 'sandbox'],
      required: true,
    },
    orgId: { 
      type: String, 
      unique: true,
      required: true,
    },
    companyId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Company', 
      required: true,
    },
    identityUrl:{
        type: String,
        required: true,
    }
  }
);

const salesforceOrg= mongoose.model('SalesforceOrg',salesforceOrgSchema)
module.exports = salesforceOrg;