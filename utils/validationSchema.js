const Joi = require("joi");

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    next();
  };
};

const passwordSchema = Joi.object({
  password: Joi.string()
    .min(8)
    .max(30)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[\w\W]+$/)
    .required()
    .messages({
      "string.pattern.base":
        "Password must include at least one uppercase letter, one lowercase letter, one number, and one special character.",
    }),
});

const registerSchema = Joi.object({
  userName: Joi.string().required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().optional().allow('', null),
  email: Joi.string().required(),
  phoneNumber: Joi.string().optional().allow('', null),
  role: Joi.optional().allow(null),
});

const loginSchema = Joi.object({
  email: Joi.string().required(),
  password: Joi.string().required()
});

module.exports = {
  validateRequest,
  passwordSchema,
  registerSchema,
  loginSchema
};