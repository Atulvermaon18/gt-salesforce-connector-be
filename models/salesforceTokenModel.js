const mongoose = require('mongoose');

const salesforceTokenSchema = new mongoose.Schema(
  {
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
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
    userId: {
      type: String,
      required: true,
    },
    organizationId: {
      type: String,
      required: true,
      unique: true,
    },
    environment: {
      type: String,
      enum: ['production', 'sandbox'],
      required: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

module.exports = mongoose.model('SalesforceToken', salesforceTokenSchema);