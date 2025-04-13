const responseHandler = (req, res, next) => {
    const originalJson = res.json;

    // Override the res.json function
    res.json = function (data) {
        const formattedResponse = {
            success: res.statusCode < 400, // true for status codes < 400
            message: data.message || (res.statusCode < 400 ? 'Success' : 'Error'),
            ...(res.statusCode < 400 && (data.data ? { data: data.data } : data.message ? { data } : { data }))
        };

        // Call the original json function with our formatted response
        return originalJson.call(this, formattedResponse);
    };
    next();
};

module.exports = responseHandler; 