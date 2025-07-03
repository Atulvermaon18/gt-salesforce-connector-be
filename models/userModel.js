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

  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Roles',
    required: false
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

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Create indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ isActive: 1 });

userSchema.pre('save', async function (next) {
  // Only proceed if either password or temporaryPassword has been modified
  if (!this.isModified('password') && !this.isModified('temporaryPassword')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);

  // Hash password if modified
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Hash temporaryPassword if modified
  if (this.isModified('temporaryPassword') && this.temporaryPassword) {
    this.temporaryPassword = await bcrypt.hash(this.temporaryPassword, salt);
  }

  next();
});

const User = mongoose.model('Users', userSchema);

// Drop any problematic indexes
User.collection.dropIndex('this_1').catch(() => {
  // Ignore error if index doesn't exist
});

module.exports = User;
