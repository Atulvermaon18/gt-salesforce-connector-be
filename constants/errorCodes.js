const errorCodes = {
    EC001: {
        code: "EC001",
        message: "Invalid Password",
        description: "The password provided is incorrect.",
        action: "Please verify your password and try again."
    },
    EC002: {
        code: "EC002",
        message: "Invalid Email",
        description: "No user exists with the provided email address.",
        action: "Please check your email or sign up for an account."
    },
    EC003: {
        code: "EC003",
        message: "Account is inactive. Please contact administrator.",
        description: "The account is inactive.",
        action: "Contact the administrator to reactivate your account."
    },
    EC004: {
        code: "EC004",
        message: "User Not Found",
        description: "No user was found for the provided identifier.",
        action: "Ensure the user identifier is correct."
    },
    EC005: {
        code: "EC005",
        message: "Invalid or Expired Token",
        description: "The provided token is either invalid or has expired.",
        action: "Reauthenticate or request a new token."
    },
    EC006: {
        code: "EC006",
        message: "Invalid Request Data",
        description: "The request data does not meet validation requirements.",
        action: "Review your input and try again."
    }
};

module.exports = errorCodes; 