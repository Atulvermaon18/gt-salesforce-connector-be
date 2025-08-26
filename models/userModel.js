const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const withBaseSchema = require('./baseSchema.js');
const { MAX_LENGTH } = require('../constants/utilityConstant');

const userSchemaDefinition = {
  userName: {
    type: String,
    required: true,
    maxLength: MAX_LENGTH.SHORT
  },

  firstName: {
    type: String,
    required: true,
    maxLength: MAX_LENGTH.SHORT
  },

  lastName: {
    type: String,
    maxLength: MAX_LENGTH.SHORT
  },

  email: {
    type: String,
    required: true,
    unique: true,
    maxLength: MAX_LENGTH.MEDIUM
  },

  phoneNumber: {
    type: String,
    maxLength: MAX_LENGTH.SHORT
  },

  temporaryPassword: {
    type: String,
    maxLength: MAX_LENGTH.MEDIUM
  },

  password: {
    type: String,
    maxLength: MAX_LENGTH.LONG
  },

  profileImage: {
    type: String,
  },

  tokenVersion: {
    type: Number,
    default: 0,
  },

  companyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Company',
  },

  orgIds: [{
    type: String,
    ref: 'SalesforceOrg',
  }], 
}

const userSchema = withBaseSchema(userSchemaDefinition);

// 🔹 Virtual populate: Attach role to User dynamically
userSchema.virtual('role', {
  ref: 'Roles',                  // Which model to populate
  localField: '_id',            // User._id
  foreignField: 'users',        // Role.users contains user IDs
  justOne: true                 // Each user has only one role
});

// Ensure virtuals show up in JSON / objects
userSchema.set('toObject', { virtuals: true });
userSchema.set('toJSON', { virtuals: true });

// Methods
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ isActive: 1 });

// Pre-save hook for hashing passwords
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') && !this.isModified('temporaryPassword')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);

  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, salt);
  }

  if (this.isModified('temporaryPassword') && this.temporaryPassword) {
    this.temporaryPassword = await bcrypt.hash(this.temporaryPassword, salt);
  }

  next();
});

const User = mongoose.model('Users', userSchema);

// Drop any problematic indexes
User.collection.dropIndex('this_1').catch(() => {});

module.exports = User;
