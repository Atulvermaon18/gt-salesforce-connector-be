const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: false,
  },
  method: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  statusCode: {
    type: Number,
    required: true,
  },
  userAgent: {
    type: String,
  },
  ipAddress: {
    type: String,
  },
  requestBody: {
    type: mongoose.Schema.Types.Mixed,
  },
  responseBody: {
    type: mongoose.Schema.Types.Mixed,
  },
}, { timestamps: true });

activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;