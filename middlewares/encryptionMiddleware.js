const CryptoJS = require('crypto-js');


const decryptRequest = (req, res, next) => {
    try {
        if (req.body && req.body.encryptedData) {
            const bytes = CryptoJS.AES.decrypt(req.body.encryptedData, process.env.ENCRYPTION_KEY);
            const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
            req.body = JSON.parse(decryptedString);
        }
        next();
    } catch (error) {
        console.error('Decryption error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });
        res.status(400).json({ success: false, message: 'Invalid encrypted data' });
    }
};

const encryptResponse = (req, res, next) => {
    const originalSend = res.json;
    res.json = function (data) {
        if (data) {
            data = {
                encryptedData: CryptoJS.AES.encrypt(
                    JSON.stringify(data),
                    process.env.ENCRYPTION_KEY
                ).toString()
            };
        }
        return originalSend.call(this, data);
    };
    next();
};

module.exports = { decryptRequest, encryptResponse }; 