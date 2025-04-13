const mongoose = require("mongoose");
const withBaseSchema = require('./baseSchema.js');
const { MAX_LENGTH } = require('../constants/utilityConstant');

const RoleSchema = withBaseSchema({
    name: { type: String, required: true, unique: true, maxLength: MAX_LENGTH.SHORT },
    description: { type: String, maxLength: MAX_LENGTH.LONG },
    qCode: { type: String, required: true, unique: true, maxLength: MAX_LENGTH.SHORT },
    permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permissions' }]
});

const Role = mongoose.model("Roles", RoleSchema);

module.exports = Role;
