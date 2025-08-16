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
  referenceTo:[String],
  relationshipName: String,
  permissionId: String,
  metadata: {
    type: String,
    default: '{}'
  }
}, { _id: true });

// Fixed highlightFieldsSchema - removed the array brackets around the object definition
const highlightFieldsSchema = new mongoose.Schema({
  image: { type: String, default: '' },
  fields: [{  // This is correct - array of objects
    label: {type: String, required: true},
    type: {type: String, required: true},
    value: {type: String, required: true}
  }]
},{_id:false});

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
  highlightFields: highlightFieldsSchema,  // This should work now
  metadata: {
    type: String,
    default: '{}'
  }
}, { timestamps: true });

const SObject = mongoose.model('SObject', sobjectSchema);

module.exports = SObject;