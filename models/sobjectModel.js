const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  type: String,
  soapType: String,
  length: Number,
  byteLength: Number,
  precision: Number,
  scale: Number,
  custom: Boolean,
  permissionId: String,
  metadata: {
    type: String,
    default: '{}'
  }
}, { _id: true });

const sobjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  label: {
    type: String,
    required: true
  },
  keyPrefix: String,
  labelPlural: String,
  permissionId: String,
  fields: [fieldSchema],
  metadata: {
    type: String,
    default: '{}'
  }
}, { timestamps: true });

const SObject = mongoose.model('SObject', sobjectSchema);

module.exports = SObject; 