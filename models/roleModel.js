const mongoose = require("mongoose");
const withBaseSchema = require('./baseSchema.js');
const { MAX_LENGTH } = require('../constants/utilityConstant');

const RoleSchema = withBaseSchema({
    name: { type: String, required: true, unique: true, maxLength: MAX_LENGTH.SHORT },
    description: { type: String, maxLength: MAX_LENGTH.LONG },
    users: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Users' 
    }],
    permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permissions' }]
});

// Remove qCode field if it exists
RoleSchema.pre('save', function(next) {
    if (this.isNew) {
        delete this.qCode;
    }
    next();
});

// Drop the qCode index if it exists
RoleSchema.index({ name: 1 }, { unique: true });
RoleSchema.index({ qCode: 1 }, { unique: false });

const Role = mongoose.model("Roles", RoleSchema);

// Drop the qCode index if it exists
Role.collection.dropIndex('qCode_1').catch(() => {
    // Ignore error if index doesn't exist
});

module.exports = Role;
