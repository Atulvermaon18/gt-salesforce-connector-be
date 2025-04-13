const Session = require('../models/sessionModel.js');

const generateTemporaryPassword = () => {
    return Math.random().toString(36).slice(-8);
};

const generateResetUrl = (token) => {
    return `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
};

const invalidateUserSessions = async (userId) => {
    try {
        await Session.updateMany({ userId }, { $set: { refreshToken: "", updatedAt: Date.now() } });
        return true;
    } catch (error) {
        console.error('Error deleting user sessions:', error);
        return false;
    }
};

module.exports = {
    generateTemporaryPassword,
    generateResetUrl,
    invalidateUserSessions
};