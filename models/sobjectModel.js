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
  permissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission',
    default: null
  },
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
  permissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission',
    default: null
  },
  fields: [fieldSchema],
  metadata: {
    type: String,
    default: '{}'
  }
}, { timestamps: true });

const SObject = mongoose.model('SObject', sobjectSchema);

module.exports = SObject; 