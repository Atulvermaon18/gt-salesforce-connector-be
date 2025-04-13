const jwt = require('jsonwebtoken');

const generateAccessToken = (id, tokenVersion) => {
  return jwt.sign({ id, tokenVersion }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: '1d',
  });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "3d"
  });
};

const generateEmailToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_EMAIL_SECRET, {
    expiresIn: '1d',
  });
};

module.exports = { generateAccessToken, generateRefreshToken, generateEmailToken };
