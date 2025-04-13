const mongoose = require('mongoose');

const baseSchema = {
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    default: null,
  },
  modifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
};

const withBaseSchema = (schemaDefinition) => {
  const schema = new mongoose.Schema(
    {
      ...schemaDefinition,
      ...baseSchema,
    },
    { timestamps: true }
  );

  // Middleware to ensure createdBy is set only on creation
  schema.pre("save", function (next) {
    if (this.isNew && !this.createdBy) {
      this.createdBy = this._id;
    }
    next();
  });

  return schema;
};

module.exports = withBaseSchema;
