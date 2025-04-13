// Function to check for NoSQL injection attempts
const hasNoSQLInjection = (value) => {
    if (typeof value !== 'string') return false;
    
    // Common NoSQL injection patterns for MongoDB
    const noSQLPatterns = [
        /\$where/i,                                  // $where operator
        /\$ne/i,                                     // not equal operator
        /\$gt/i,                                     // greater than operator
        /\$lt/i,                                     // less than operator
        /\$exists/i,                                 // exists operator
        /\$regex/i,                                  // regex operator
        /"?\$\{"?\s*:/,                             // Object injection attempt
        /\{\s*\$[a-zA-Z]+\s*:/,                     // MongoDB operator at start of object
        /\$\[.*\]/,                                  // Array operator injection
        /\$elemMatch/i,                              // elemMatch operator
        /\$or|\$and|\$not|\$nor/i,                  // Logical operators
        /\$set|\$unset|\$inc/i,                     // Update operators
        /\$push|\$pull|\$pop/i                      // Array update operators
    ];

    return noSQLPatterns.some(pattern => pattern.test(value));
};

// Function to check for XSS attempts and HTML tags
const hasXSSorHTML = (value) => {
    if (typeof value !== 'string') return false;

    // Check for common XSS patterns and HTML tags
    const xssPatterns = [
        // Basic HTML tag detection
        /<[a-zA-Z\/]/i,                             // Any HTML opening tag
        /</i,                                        // Less than symbol (potential HTML)
        />/i,                                        // Greater than symbol (potential HTML)
        
        // Specific dangerous tags
        /<script/i,                                  // Script tag (partial or complete)
        /<style/i,                                   // Style tag (partial or complete)
        /<iframe/i,                                  // Iframe tag (partial or complete)
        /<object/i,                                  // Object tag (partial or complete)
        /<embed/i,                                   // Embed tag (partial or complete)
        /<link/i,                                    // Link tag (partial or complete)
        /<meta/i,                                    // Meta tag (partial or complete)
        /<base/i,                                    // Base tag (partial or complete)
        
        // Event handlers and javascript
        /on\w+\s*=/i,                               // Event handlers
        /javascript:/i,                              // JavaScript protocol
        /data:\s*text\/html/i,                      // Data URL with HTML
        /data:\s*application\/javascript/i,          // Data URL with JavaScript
        /data:\s*application\/x-javascript/i,        // Data URL variants
        /data:\s*text\/javascript/i,                 // Data URL variants
        /vbscript:/i,                               // VBScript protocol
        
        // Encoded content
        /&lt;/i,                                    // HTML encoded <
        /&gt;/i,                                    // HTML encoded >
        /&#x3C;/i,                                  // Hex encoded <
        /&#x3E;/i,                                  // Hex encoded >
        /&#60;/i,                                   // Decimal encoded <
        /&#62;/i,                                   // Decimal encoded >
        /\\\x3C/i,                                  // Escaped <
        /\\\x3E/i,                                  // Escaped >
        
        // Additional dangerous patterns
        /expression\s*\(/i,                         // CSS expression
        /url\s*\(/i,                                // CSS url
        /@import/i                                  // CSS import
    ];

    return xssPatterns.some(pattern => pattern.test(value));
};

// Recursive function to check all values in an object
const checkObjectForThreats = (obj, checkFn) => {
    for (let key in obj) {
        if (obj[key] && typeof obj[key] === 'object') {
            if (checkObjectForThreats(obj[key], checkFn)) return true;
        } else if (checkFn(obj[key])) {
            return true;
        }
    }
    return false;
};

// Main security middleware
const securityMiddleware = [(req, res, next) => {
    // Check for NoSQL Injection
    if (checkObjectForThreats(req.body, hasNoSQLInjection)) {
        return res.status(400).json({
            success: false,
            message: 'Potential NoSQL injection detected in request body'
        });
    }

    if (checkObjectForThreats(req.query, hasNoSQLInjection)) {
        return res.status(400).json({
            success: false,
            message: 'Potential NoSQL injection detected in query parameters'
        });
    }

    if (checkObjectForThreats(req.params, hasNoSQLInjection)) {
        return res.status(400).json({
            success: false,
            message: 'Potential NoSQL injection detected in URL parameters'
        });
    }

    // Check for XSS and HTML tags
    if (checkObjectForThreats(req.body, hasXSSorHTML)) {
        return res.status(400).json({
            success: false,
            message: 'Potential XSS attack detected in request body'
        });
    }

    if (checkObjectForThreats(req.query, hasXSSorHTML)) {
        return res.status(400).json({
            success: false,
            message: 'Potential XSS attack detected in query parameters'
        });
    }

    if (checkObjectForThreats(req.params, hasXSSorHTML)) {
        return res.status(400).json({
            success: false,
            message: 'Potential XSS attack detected in URL parameters'
        });
    }

    next();
}];

module.exports = securityMiddleware;
