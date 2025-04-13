const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/userModel.js');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      } catch (jwtError) {
        if (jwtError.name === 'TokenExpiredError') {
          return res.status(401).json({ message: 'Token has expired, please login again' });
        }
        return res.status(401).json({ message: 'Not authorized, invalid token' });
      }

      req.user = await User.findById(decoded.id)
        .select('-password -temporaryPassword')
        .populate({
          path: 'role',
          select: '_id name qCode',
          populate: {
            path: 'permissions',
            select: '_id name qCode'
          }
        });
      
      if (!req.user || !req.user.isActive || decoded.tokenVersion !== req.user.tokenVersion) {
        return res.status(401).json({ message: req.user.isActive ? 'Not authorized, token failed' : 'Account deactivated' });
      }
      
      next();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: error.message });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
});

const authorizePermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user || !Array.isArray(req.user.role)) {
      console.log('No roles or permissions');
      return res.status(401).json({ message: 'Not authorized for this action' });
    }

    const hasPermission = req.user.role.some(role =>
      Array.isArray(role.permissions) &&
      role.permissions.some(permission => {
        if (Array.isArray(requiredPermission)) {
          return requiredPermission.includes(permission.qCode);
        }
        return permission.qCode === requiredPermission;
      })
    );
    
    if (hasPermission) {
      next();
    } else {
      return res.status(401).json({ message: 'Not authorized for this action' });
    }
  };
};

module.exports = { protect, authorizePermission };
