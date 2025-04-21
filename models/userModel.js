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
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Roles' }],
    required: true,
    default: []
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
      type: String
    }], 
}

const userSchema = withBaseSchema(userSchemaDefinition);

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.index({ email: 1, isActive: 1,role: 1 });  

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

  // Only proceed if role is not set
  if (this.role && this.role.length > 0) {
    return next();
  }

  try {
    // Find the role with qCode "USER"
    const defaultRole = await mongoose.model('Roles').findOne({ qCode: 'USER' });
    if (defaultRole) {
      this.role = [defaultRole._id];
    }
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('Users', userSchema);
module.exports = User;
