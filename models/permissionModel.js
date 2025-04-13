const mongoose = require("mongoose");
const withBaseSchema = require('./baseSchema.js');
const { MAX_LENGTH } = require('../constants/utilityConstant');

const PermissionSchema = withBaseSchema({
    name: { type: String, required: true, unique: true, maxLength: MAX_LENGTH.SHORT },
    description: { type: String, maxLength: MAX_LENGTH.LONG },
    qCode: { type: String, required: true, unique: true, maxLength: MAX_LENGTH.SHORT }
});

const Permission = mongoose.model("Permissions", PermissionSchema);

module.exports = Permission;