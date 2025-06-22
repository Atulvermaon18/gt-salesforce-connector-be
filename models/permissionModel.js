const mongoose = require("mongoose");
const withBaseSchema = require('./baseSchema.js');
const { MAX_LENGTH } = require('../constants/utilityConstant');
const FeildSchema = new mongoose.Schema(
    {
        name: { type: String },
        permissionId: { type: String },
    }
    , { _id: false })
const SObjectSchema = new mongoose.Schema(
    {
        name: { type: String },
        permissionId: { type: String },
        fields: [FeildSchema]
    }
    , { _id: false })
const PermissionSchema = withBaseSchema({
    name: { type: String, required: true, unique: true, maxLength: MAX_LENGTH.SHORT },
    description: { type: String, maxLength: MAX_LENGTH.LONG },
    // qCode: { type: String, required: true, maxLength: MAX_LENGTH.SHORT }
    sobject: [SObjectSchema],

});

const Permission = mongoose.model("Permissions", PermissionSchema);

// Drop the qCode unique index if it exists
Permission.collection.dropIndex('qCode_1').catch(() => {
    // Ignore error if index doesn't exist
});

module.exports = Permission;