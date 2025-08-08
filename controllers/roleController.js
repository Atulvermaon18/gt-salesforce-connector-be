const Role = require("../models/roleModel.js");
const Permission = require("../models/permissionModel.js");
const mongoose = require('mongoose');
const User = require('../models/userModel.js');
const asyncHandler = require('express-async-handler');

//@desc     Get all roles
//@route    GET api/roles
//@access   Private/Admin
exports.getRoles = asyncHandler(async (req, res) => {
    const roles = await Role.find({})
        .populate({
            path: 'permissions',
            select: '_id name description'
        })
        .populate({
            path: 'users',
            select: '_id userName email firstName lastName'
        });

    res.json(roles);
});

//@desc     Get single role
//@route    GET api/roles/:id
//@access   Private/Admin
exports.getRoleById = asyncHandler(async (req, res) => {
    const role = await Role.findById(req.params.id)
        .populate({
            path: 'permissions',
            select: '_id name description'
        })
        .populate({
            path: 'users',
            select: '_id userName email firstName lastName'
        });

    if (role) {
        res.json(role);
    } else {
        res.status(404);
        throw new Error('Role not found');
    }
});

//@desc     Create a role
//@route    POST api/roles
//@access   Private/Admin
exports.createRole = asyncHandler(async (req, res) => {
    const { name, description, permissions, users } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
        res.status(400);
        throw new Error('Role name is required');
    }

    const roleExists = await Role.findOne({ name });

    if (roleExists) {
        res.status(400);
        throw new Error('Role already exists');
    }

    // Create role without qCode
    const role = await Role.create({
        name: name.trim(),
        description: description?.trim(),
        users: users || [],
        permissions: permissions || []
    });

    if (role) {
        // Populate the created role
        const populatedRole = await Role.findById(role._id)
            .populate({
                path: 'permissions',
                select: '_id name description'
            })
            .populate({
                path: 'users',
                select: '_id userName email firstName lastName'
            });

        res.status(201).json(populatedRole);
    } else {
        res.status(400);
        throw new Error('Invalid role data');
    }
});

//@desc     Update a role
//@route    PUT api/roles/:id
//@access   Private/Admin
exports.updateRole = asyncHandler(async (req, res) => {
    const { name, description, permissions,users } = req.body;

    const role = await Role.findById(req.params.id);

    if (role) {
        role.name = name || role.name;
        role.description = description || role.description;
        role.permissions = permissions || role.permissions;
        role.users = users || role.users;
        const updatedRole = await role.save();

        res.json(updatedRole);
    } else {
        res.status(404);
        throw new Error('Role not found');
    }
});

//@desc     Delete a role
//@route    DELETE api/roles/:id
//@access   Private/Admin
exports.deleteRole = asyncHandler(async (req, res) => {
    const role = await Role.findById(req.params.id);

    if (role) {
        // Check if role has any users
        if (role.users && role.users.length > 0) {
            res.status(400).json({ message: 'Cannot delete role with assigned users' });
            throw new Error('Cannot delete role with assigned users');
        }

        await role.deleteOne();
        res.json({ message: 'Role removed' });
    } else {
        res.status(404);
        throw new Error('Role not found');
    }
});

//@desc     Add user to role
//@route    POST api/roles/:id/users
//@access   Private/Admin
exports.addUserToRole = asyncHandler(async (req, res) => {
    const { userId } = req.body;
    const role = await Role.findById(req.params.id);

    if (!role) {
        res.status(404);
        throw new Error('Role not found');
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Add user to role if not already present
    if (!role.users.includes(userId)) {
        role.users.push(userId);
        await role.save();
    }

    // Update user's role
    user.role = role._id;
    await user.save();

    res.json(role);
});

//@desc     Remove user from role
//@route    DELETE api/roles/:id/users/:userId
//@access   Private/Admin
exports.removeUserFromRole = asyncHandler(async (req, res) => {
    const role = await Role.findById(req.params.id);

    if (!role) {
        res.status(404);
        throw new Error('Role not found');
    }

    // Remove user from role
    role.users = role.users.filter(user => user.toString() !== req.params.userId);
    await role.save();

    // Update user's role to null
    await User.findByIdAndUpdate(req.params.userId, { role: null });

    res.json(role);
});

//@desc     Get permissions for a role
//@route    GET /api/roles/:roleId/permissions
//@access   Private
exports.getPermissions = async (req, res) => {
    try {
        const role = await Role.findById(req.params.roleId).populate({
            path: 'permissions',
            select: '_id name description qCode'
        });

        if (!role) {
            return res.status(404).json({
                message: 'Role not found'
            });
        }

        res.json(role.permissions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//@desc     Assign multiple permissions to a role
//@route    POST /api/roles/:roleId/permissions
//@access   Private
exports.assignPermissions = async (req, res) => {
    try {
        const role = await Role.findById(req.params.roleId);
        if (!role) {
            return res.status(404).json({ message: 'Role not found' });
        }
        const permissions = req.body.permissions; // array of permission IDs
        role.permissions.push(...permissions); // add permissions to the role
        await role.save();
        res.status(200).json({ message: 'Pemission assigned to role,updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//@desc     Update permissions for a role
//@route    PUT /api/roles/:roleId/permissions
//@access   Private
exports.updatePermissions = async (req, res) => {
    try {
        const role = await Role.findById(req.params.roleId);
        if (!role) {
            return res.status(404).json({ message: 'Role not found' });
        }

        // Get the permissions from request
        const newPermissions = req.body.permissions;

        if (!Array.isArray(newPermissions)) {
            return res.status(400).json({ message: 'Permissions must be an array' });
        }

        // Validate all permission IDs are valid MongoDB ObjectIDs
        const validObjectIds = newPermissions.every(id => mongoose.Types.ObjectId.isValid(id));
        if (!validObjectIds) {
            return res.status(400).json({ message: 'Invalid permission ID format' });
        }

        // Check if all permissions exist in the database
        const existingPermissions = await Permission.find({
            _id: { $in: newPermissions }
        });

        if (existingPermissions.length !== newPermissions.length) {
            return res.status(400).json({
                message: 'Some permissions do not exist'
            });
        }

        // All permissions exist, update the role
        role.permissions = newPermissions;
        await role.save();
        res.status(200).json(role);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//@desc     Remove a permission from a role
//@route    DELETE /api/roles/:roleId/permissions/:permissionId
//@access   Private
exports.removePermission = async (req, res) => {
    try {
        const role = await Role.findById(req.params.roleId);
        if (!role) {
            return res.status(404).json({ message: 'Role not found' });
        }
        role.permissions = role.permissions.filter(permission => permission.toString() !== req.params.permissionId);
        await role.save();
        res.status(200).json({ message: "permission removed" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};