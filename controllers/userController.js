const User = require('../models/userModel.js');
const asyncHandler = require('express-async-handler');
const { generateAccessToken, generateEmailToken, generateRefreshToken } = require('../utils/generateToken.js');
const { generateTemporaryPassword, generateResetUrl, invalidateUserSessions } = require('../utils/utilFunctions.js');
const sendEmail = require('../utils/mailTrigger.js');
const { passwordSchema } = require('../utils/validationSchema.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Session = require('../models/sessionModel.js');
const SalesforceOrg = require('../models/salesforceOrgModel.js');
const role=require('../models/roleModel.js')

//@desc     Auth User & Get Token
//@route    POST api/users/login
//@access   Public
exports.login = asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email })
      // .populate({
      //   path: 'orgIds',
      //   select: '_id environment status orgId'
      // }).populate({
      //   path: 'companyId',
      //   select: '_id name'
      // });

    // Check if user exists and is active
    if (!user || !user.isActive) {
      return res.status(400).json({
        message: !user ? "Invalid email" : "Account is inactive. Please contact administrator."
      });
    }

    if (user.password && (await user.matchPassword(password))) {
      user.tokenVersion++;

      const accessToken = generateAccessToken(user._id, user.tokenVersion);
      const refreshToken = generateRefreshToken(user._id);

      await invalidateUserSessions(user._id);

      if (user.temporaryPassword) {
        user.temporaryPassword = null;
      }

      await Promise.all([
        user.save(),
        Session.create({
          userId: user._id, userName: user.userName,
          refreshToken,
          userAgent: req.headers['user-agent']
        })
      ]);

      // Process role
      const permission=await role.find({users:user._id}).lean().populate({
        path:'permissions',
        select:'_id name description sobject resource modules'
      })
      // const role = permission ? {
      //   _id: permission._id,
      //   name: permission.name,
      //   description: permission.description,
      //   // permissions: permission.permissions.map(permission => ({
      //   //   _id: permission._id,
      //   //   name: permission.name,
      //   //   description: permission.description
      //   // }))
      // } : null;

      // Set refresh token in HTTP-only cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return res.json({
        _id: user._id,
        userName: user.userName,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        email: user.email,
        isActive: user.isActive,
        companyId: user.companyId,
        orgIds: user.orgIds,
        role:permission,
        token: accessToken,
      });
    } else {
      return res.status(400).json({
        message: user.password ? "Invalid Password" : "Check your email to set your password"
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//@desc     REGISTER User & Get Token
//@route    POST api/users/register
//@access   Public
exports.register = asyncHandler(async (req, res) => {
  try {
    const { userName, firstName, lastName, email, phoneNumber, role } = req.body;
    const userExist = await User.findOne({ email });

    if (userExist) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    const temporaryPassword = generateTemporaryPassword();
    // Create user object with required fields
    const userData = {
      userName,
      firstName,
      lastName,
      email,
      temporaryPassword,
      phoneNumber
    };

    // Add role only if it exists in the request body
    if (role) {
      userData.role = role;
    }

    const user = await User.create(userData);

    if (!user) {
      return res.status(400).json({
        message: "Invalid user data"
      });
    }

    const token = generateEmailToken(user._id);

    // Generate the reset URL and email content
    const resetUrl = generateResetUrl(token);

    await sendEmail(user.email, user.firstName, temporaryPassword, resetUrl);

    res.json({
      _id: user._id,
      userName: user.userName,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      message: 'User registered successfully. Please check your email to set your password.',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc     Reset Password
// @route    POST api/users/reset-password
// @access   Public
exports.resetPassword = asyncHandler(async (req, res) => {
  try {
    const { token, temporaryPassword, password } = req.body;
    // Validate the new password
    const { error } = passwordSchema.validate({ password });
    if (error) {
      return res.status(400).json({
        message: error.details[0].message
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_EMAIL_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !temporaryPassword || !user.temporaryPassword) {
      return res.status(400).json({
        message: "Invalid or expired password reset request. Please try the forgot password process again."
      });
    }

    // Verify the temporary password
    const isMatch = await bcrypt.compare(temporaryPassword, user.temporaryPassword);
    if (!isMatch) {
      return res.status(400).json({
        message: "Temporary password is incorrect"
      });
    }

    // Check if new password is same as old password
    if (user.password && await user.matchPassword(password)) {
      return res.status(400).json({
        message: "New password cannot be the same as your old password"
      });
    }

    // Hash and update the new password
    user.password = password;
    user.temporaryPassword = null; // Remove temporary password
    user.tokenVersion++;

    await user.save();
    invalidateUserSessions(user._id);
    res.json({ message: "Password updated successfully. You can now log in." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//@desc     Forgot Password
//@route    POST api/users/forgot-password
//@access   Public
exports.forgotPassword = asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "User does not exist"
      });
    }

    const temporaryPassword = generateTemporaryPassword();
    const token = generateEmailToken(user._id);

    // Save the temporary password to the user document
    user.temporaryPassword = temporaryPassword;
    await user.save();

    // Generate the reset URL and email content
    const resetUrl = generateResetUrl(token);

    await sendEmail(user.email, user.firstName, temporaryPassword, resetUrl, false);

    res.json({
      userName: user.userName,
      firstName: user.firstName,
      lastName: user.lastName,
      message: 'Please check your email to reset your password.',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//@desc     Logout User (from current device or all devices)
//@route    POST api/users/logout
//@access   Private
exports.logout = asyncHandler(async (req, res) => {
  try {
    const { logoutFromAll } = req.body;
    const refreshToken = req.cookies.refreshToken;

    if (logoutFromAll) {
      await Session.updateMany({ userId: req.user._id }, { $set: { refreshToken: "", updatedAt: Date.now() } });
    } else if (refreshToken) {
      // Check if a session with the given refresh token exists
      const session = await Session.findOne({ refreshToken });

      if (session) {
        await Session.updateOne({ refreshToken }, { $set: { refreshToken: "", updatedAt: Date.now() } });
      }
    }

    // Clear the refresh token cookie
    res.clearCookie('refreshToken');

    return res.json({
      message: logoutFromAll
        ? "Logged out from all devices successfully"
        : "Logged out successfully"
    });
  } catch (error) {
    res.status(500).json({
      message: "Error during logout",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

//@desc     Refresh Access Token
//@route    POST api/users/refresh-token
//@access   Public
exports.refreshToken = asyncHandler(async (req, res) => {
  try {
    // Get refresh token from cookie
    const refreshToken = req?.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        message: "No refresh token provided"
      });
    }

    // Verify refresh token and get session
    const session = await Session.findOne({ refreshToken });

    if (!session) {
      // Clear the invalid cookie
      res.clearCookie('refreshToken');
      return res.status(401).json({
        message: "Invalid refresh token"
      });
    }

    try {
      // Verify the token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      // Check if the token's user matches the session's user
      if (session.userId.toString() !== decoded.id) {
        throw new Error('Token user mismatch');
      }

      // Get user data
      const user = await User.findById(decoded.id)

      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Generate new tokens
      const newAccessToken = generateAccessToken(user._id, user.tokenVersion);

      // Return new access token and user data
      return res.json({
        token: newAccessToken,
        _id: user._id,
        profileImage: user.profileImage,
        userName: user.userName,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        email: user.email,
        isActive: user.isActive,
        role: user?.role
      });

    } catch (error) {
      console.log(error);
      // Token verification failed - remove session and cookie
      session.refreshToken = ""; // Clear the refresh token in the session
      session.updatedAt = Date.now();
      await session.save();
      res.clearCookie('refreshToken');

      return res.status(401).json({
        message: "Invalid or expired refresh token"
      });
    }
  } catch (error) {
    res.status(401).json({
      message: process.env.NODE_ENV === 'development' ? error.message : "Error refreshing token"
    });
  }
});

//@desc     Get all Users
//@route    GET api/users
//@access   Private/Admin
exports.getUsers = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const sortField = req.query.sortField || 'createdAt'; // Default sort field
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1; // Default to descending
    const isActive = req.query.isActive;

    // Build search filter
    const searchFilter = {
      $or: [
        { userName: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ]
    };

    // Add isActive filter if provided
    if (isActive !== undefined && isActive !== null) {
      searchFilter.isActive = isActive === 'true';
    }

    // Get total count for pagination
    const total = await User.countDocuments(searchFilter);

    // Regular sorting for fields directly on the user document
    const users = await User.find(searchFilter)
      .select('-password -temporaryPassword')
      .populate({
        path: 'role',
        select: '_id name description',
        populate: {
          path: 'permissions',
          select: '_id name description'
        }
      })
      .sort({ [sortField]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit);

    const formattedUsers = users.map(user => ({
      _id: user._id,
      profileImage: user.profileImage,
      userName: user.userName,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      isActive: user.isActive,
      role: user.role ? {
        _id: user.role._id,
        name: user.role.name,
        description: user.role.description,
        // permissions: user.role.permissions.map(permission => ({
        //   _id: permission._id,
        //   name: permission.name,
        //   description: permission.description
        // }))
      } : null
    }));

    // Send response with pagination info
    return res.json({
      users: formattedUsers,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//@desc     Get User by ID
//@route    GET api/users/:userId
//@access   Private
exports.getUserById = asyncHandler(async (req, res) => {
  try {
    // Validate if userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({
        message: "Invalid user ID format"
      });
    }

    const user = await User.findById(req.params.userId)
      .select('-password -temporaryPassword')
      .populate({
        path: 'role',
        select: '_id name description qCode',
        populate: {
          path: 'permissions',
          select: '_id name description qCode'
        }
      });

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json({
      _id: user._id,
      profileImage: user.profileImage,
      userName: user.userName,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      isActive: user.isActive,
      // role: user.role.map(role => ({
        // _id: role._id,
        // name: role.name,
        // description: role.description,
        // qCode: role.qCode,
        // permissions: role?.permissions?.map(permission => ({
        //   _id: permission._id,
        //   name: permission.name,
        //   description: permission.description,
        //   qCode: permission.qCode
        // }))
      // }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//@desc     Update User
//@route    PUT api/users
//@access   Private
exports.updateUserById = asyncHandler(async (req, res) => {
  try {
    // Validate if userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({
        message: "Invalid user ID format"
      });
    }

    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // Check for restricted fields
    if (req.body.password || req.body.email) {
      return res.status(400).json({
        message: "Cannot update password or email"
      });
    }

    // Update only the allowed fields
    user.profileImage = req.body?.profileImage || user.profileImage;
    user.userName = req.body?.userName || user.userName;
    user.firstName = req.body?.firstName || user.firstName;
    user.lastName = req.body?.lastName || user.lastName;
    user.phoneNumber = req.body?.phoneNumber || user.phoneNumber;
    
    // Handle role update - take the first role if array is provided
    if (req.body?.role) {
      if (Array.isArray(req.body.role)) {
        user.role = req.body.role[0]; // Take the first role from the array
      } else {
        user.role = req.body.role;
      }
    }

    const updatedUser = await user.save();

    // Fetch the updated user with populated roles and permissions
    const populatedUser = await User.findById(updatedUser._id)
      .select('-password -temporaryPassword')
      .populate({
        path: 'role',
        select: '_id name description',
        populate: {
          path: 'permissions',
          select: '_id name description'
        }
      });

    res.json({
      _id: populatedUser._id,
      profileImage: populatedUser.profileImage,
      userName: populatedUser.userName,
      firstName: populatedUser.firstName,
      lastName: populatedUser.lastName,
      email: populatedUser.email,
      phoneNumber: populatedUser.phoneNumber,
      role: populatedUser.role ? {
        _id: populatedUser.role._id,
        name: populatedUser.role.name,
        description: populatedUser.role.description,
        permissions: populatedUser.role.permissions.map(permission => ({
          _id: permission._id,
          name: permission.name,
          description: permission.description
        }))
      } : null,
      message: "User updated successfully"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//@desc     Toggle User Status (Activate/Deactivate)
//@route    PUT api/users/update-status
//@access   Private
exports.toggleUserStatus = asyncHandler(async (req, res) => {
  try {
    const { users } = req.body;

    if (!users || !Array.isArray(users)) {
      return res.status(400).json({
        message: "Please provide an array of users with IDs and status"
      });
    }
    // Validate ObjectIds before processing
    const validUserIds = users.every(({ userId }) =>
      mongoose.Types.ObjectId.isValid(userId)
    );

    if (!validUserIds) {
      return res.status(400).json({
        message: "Invalid user ID format"
      });
    }

    const bulkOps = users?.map(({ userId, status }) => ({
      updateOne: {
        filter: { _id: userId },
        update: { isActive: status }
      }
    }));

    const updateResult = await User.bulkWrite(bulkOps);

    if (updateResult.modifiedCount === 0) {
      return res.status(404).json({
        message: "No users found to update"
      });
    }

    res.json({
      message: `Successfully updated status for ${updateResult.modifiedCount} users`,
      modifiedCount: updateResult.modifiedCount,
      users
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//@desc     Update User Profile
//@route    PUT api/users/profile
//@access   Private
exports.updateProfile = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // Check for restricted fields
    if (req.body.password || req.body.email || req.body.role) {
      return res.status(400).json({
        message: "Cannot update password, email, or role"
      });
    }

    // Update only the allowed fields
    user.profileImage = req.body?.profileImage || user.profileImage;
    user.userName = req.body?.userName || user.userName;
    user.firstName = req.body?.firstName || user.firstName;
    user.lastName = req.body?.lastName || user.lastName;
    user.phoneNumber = req.body?.phoneNumber || user.phoneNumber;

    const updatedUser = await user.save();

    // Fetch the updated user with populated roles and permissions
    const populatedUser = await User.findById(updatedUser._id)
      .select('-password -temporaryPassword')
      .populate({
        path: 'role',
        select: '_id name',
        populate: {
          path: 'permissions',
          select: '_id name'
        }
      });

    res.json({
      _id: populatedUser._id,
      profileImage: populatedUser.profileImage,
      userName: populatedUser.userName,
      firstName: populatedUser.firstName,
      lastName: populatedUser.lastName,
      email: populatedUser.email,
      phoneNumber: populatedUser.phoneNumber,
      role: populatedUser?.role?.map(role => ({
        _id: role._id,
        name: role.name,
        permissions: role?.permissions?.map(permission => ({
          _id: permission._id,
          name: permission.name
        }))
      })),
      message: "Profile updated successfully"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//@desc     Deactivate Account
//@route    DELETE api/users/deactivate
//@access   Private
exports.deactivateAccount = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    user.isActive = false;
    await user.save();

    // Clear all refresh tokens for this user
    await Session.updateMany({ userId: user._id }, { $set: { refreshToken: "", updatedAt: Date.now() } });
    res.clearCookie('refreshToken');

    res.json({
      message: "Account deactivated successfully"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//@desc     Assign Roles to User
//@route    POST api/users/assign-role
//@access   Private/Admin
exports.assignRole = asyncHandler(async (req, res) => {
  const { userId, roleIds } = req.body;

  // Validate request body
  if (!userId || !roleIds || !Array.isArray(roleIds)) {
    return res.status(400).json({
      message: "User ID and Role IDs array are required"
    });
  }

  try {
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // Validate all role IDs exist
    const roles = await mongoose.model('Roles').find({
      _id: { $in: roleIds }
    });
    if (roles.length !== roleIds.length) {
      return res.status(404).json({
        message: "One or more roles not found"
      });
    }

    // Assign the roles (this will replace existing roles)
    user.role = roleIds;
    await user.save();

    // Fetch updated user with populated roles
    const updatedUser = await User.findById(userId)
      .select('-password -temporaryPassword')
      .populate({
        path: 'role',
        select: '_id name description qCode',
        populate: {
          path: 'permissions',
          select: '_id name description qCode'
        }
      });

    res.json({
      message: "Roles assigned successfully",
      user: {
        _id: updatedUser._id,
        userName: updatedUser.userName,
        role: updatedUser?.role?.map(role => ({
          _id: role._id,
          name: role.name,
          description: role.description,
          qCode: role.qCode,
          permissions: role?.permissions?.map(permission => ({
            _id: permission._id,
            name: permission.name,
            description: permission.description,
            qCode: permission.qCode
          }))
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get login/logout logs
// @route   GET /api/users/logs
// @access  Private/Admin
exports.getLoginLogoutLogs = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', fromDate, toDate, sortField = 'createdAt', sortOrder = 'desc' } = req.query;

    // Determine the query based on user permissions
    let query = {};
    if (req.user.role.some(role => role.permissions.some(permission => permission.qCode === 'VIEW_ALL_AUDIT'))) {
      query = {};
    } else if (req.user.role.some(role => role.permissions.some(permission => permission.qCode === 'VIEW_SELF_AUDIT'))) {
      query = { userId: req.user._id };
    } else {
      return res.status(401).json({ message: 'Not authorized to view logs' });
    }

    // Add search filter
    if (search) {
      query.$or = [
        { 'userName': { $regex: search, $options: 'i' } }
      ];
    }

    // Add date range filter
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) {
        query.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        query.createdAt.$lte = new Date(toDate);
      }
    }

    // Get total count for pagination
    const total = await Session.countDocuments(query);

    // Fetch sessions with pagination and sorting
    const sessions = await Session.find(query)
      .populate('userId', 'email')
      .sort({ [sortField]: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const formattedLogs = sessions.map(session => ({
      username: session.userName,
      email: session.userId.email,
      loginTime: session.createdAt,
      logoutTime: session.updatedAt,
      ipAddress: session.ipAddress,
      agent: session.userAgent,
    }));

    // Send response with pagination info
    res.status(200).json({
      logs: formattedLogs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//@desc     Get User's Profile Image
//@route    GET api/users/profile-image
//@access   Private
exports.getProfileImage = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('profileImage');

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json({
      profileImage: user.profileImage
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//@desc     Assign Org ID to User
//@route    POST api/users/assign-org-id
//@access   Private/Admin
exports.assignOrgId = asyncHandler(async (req, res) => {
  try {
    const { userId, orgId } = req.body;

    // Validate input
    if (!userId || !orgId) {
      return res.status(400).json({ message: "User ID and Org ID are required" });
    }

    // Fetch the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(500).json({ message: "User not found" });
    }

    // Check if the orgId already exists in the user's orgIds array
    if (user.orgIds.includes(orgId)) {
      return res.status(500).json({ message: "Org ID is already assigned to the user" });
    }

    await SalesforceOrg.findById(orgId).select('orgId').then((org) => {
      if (!org) {
        return res.status(500).json({ message: "Org ID not found" });
      }
    });

    // Add the orgId to the user's orgIds array
    user.orgIds.push(orgId);
    await user.save();

    res.status(200).json({
      message: "Org ID assigned to user successfully",
      user: {
        _id: user._id,
        userName: user.userName,
        orgIds: user.orgIds,
      },
    });
  } catch (error) {
    console.error("Error assigning Org ID to user:", error.message);
    res.status(500).json({ message: "Error assigning Org ID to user" });
  }
});