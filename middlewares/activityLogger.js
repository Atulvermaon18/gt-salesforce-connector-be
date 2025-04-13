const jwt = require('jsonwebtoken');
const ActivityLog = require('../models/activityLogModel.js');

// Configuration for routes not to be logged
const routesNotToLog = [
  '/api/users/refresh-token',
];

const activityLogger = async (req, res, next) => {
  let userId = null;
  const requestBody = req.body;
  const { method, originalUrl} = req;
  const userAgent = req.headers['user-agent'];
  const ipAddress = req.ip;
  const timestamp = new Date();

  // Extract user ID from JWT token
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      userId = decoded.id;
    } catch (error) {
      console.error('Error decoding JWT:', error);
    }
  }

  // Check if the current route should not be logged
  if (routesNotToLog.includes(originalUrl)) {
    return next();
  }

  // Capture the original send method
  const originalSend = res.send;

  // Override the send method to capture the response body
  res.send = function (body) {
    res.responseBody = body;
    return originalSend.apply(this, arguments);
  };

  res.on('finish', async () => {
    const statusCode = res.statusCode;
    const log = new ActivityLog({
      userId,
      method,
      url: originalUrl,
      statusCode,
      userAgent,
      ipAddress,
      requestBody,
      responseBody: res.responseBody,
      timestamp,
    });

    try {
      await log.save();
    } catch (error) {
      console.error('Error saving activity log:', error);
    }
  });

  next();
};

module.exports = activityLogger;