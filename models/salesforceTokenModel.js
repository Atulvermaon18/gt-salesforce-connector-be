const mongoose = require('mongoose');
const withBaseSchema = require('./baseSchema.js');

const salesforceTokenSchema = withBaseSchema({
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
    sfOrganizationId: {
      type: String,
      required: true,
      unique: true,
    },
    environment: {
      type: String,
      enum: ['production', 'sandbox'],
      required: true,
    },
     userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true
      }
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

module.exports = mongoose.model('SalesforceToken', salesforceTokenSchema);