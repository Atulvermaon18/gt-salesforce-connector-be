const mongoose = require('mongoose');

const flowAssignmentsSchema = new mongoose.Schema({
    orgId: { type: String, required: true },
    flowAssignments: [{
        sObject: { type: String, required: true },
        flowIds: [{ type: String, required: true }],
    }]
}, { timestamps: true });

const FlowAssignments = mongoose.model('FlowAssignments', flowAssignmentsSchema);

module.exports = FlowAssignments;