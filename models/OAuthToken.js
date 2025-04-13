const mongoose = require('mongoose');

const oauthTokenSchema = new mongoose.Schema({
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
}, { timestamps: true });

const OAuthToken = mongoose.model('OAuthToken', oauthTokenSchema);

module.exports = { OAuthToken }; 