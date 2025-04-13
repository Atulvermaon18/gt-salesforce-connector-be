const Role = require("../models/roleModel.js");
const Permission = require("../models/permissionModel.js");
const mongoose = require('mongoose');
const User = require('../models/userModel.js');

//@desc     Get all roles
//@route    GET /api/roles
//@access   Public
exports.getRoles = async (req, res) => {
    try {
        const roles = await Role.find().select('_id name description qCode').populate({
            path: 'permissions',
            select: '_id name description qCode' // Specify the fields to include
        });
        res.json(roles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//@desc     Create a new role
//@route    POST /api/roles
//@access   Private
exports.createRole = async (req, res) => {
    try {
        const { name, description, permissions, qCode } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Role name cannot be empty' });
        }

        // Check if qCode is empty
        if (!qCode || !qCode.trim()) {
            return res.status(400).json({ message: 'Role qCode cannot be empty' });
        }
        // Check if a role with the same name or qCode already exists
        const existingRole = await Role.findOne({
            $or: [
                { name: name },
                { qCode: qCode }
            ]
        });

        if (existingRole) {
            return res.status(400).json({
                message: existingRole.name === name 
                    ? "A role with this name already exists" 
                    : "A role with this QCode already exists"
            });
        }

        if (!Array.isArray(permissions)) {
            return res.status(400).json({ message: 'Permissions must be an array' });
        }
        // Verify that all permissions exist
        if (permissions && permissions.length > 0) {
            const existingPermissions = await Permission.find({
                _id: { $in: permissions }
            });

            if (existingPermissions.length !== permissions.length) {
                return res.status(400).json({
                    message: "One or more permissions do not exist"
                });
            }
        }

        const role = new Role({ name, description, permissions, qCode });
        await role.save();
        res.status(201).json({ message: "Role created successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//@desc     Update role details
//@route    PUT /api/roles/:id
//@access   Private
exports.updateRole = async (req, res) => {
    try {
        const updateFields = {};

        // Check if name is provided but empty
        if (req.body.name !== undefined) {
            if (!req.body.name.trim()) {
                return res.status(400).json({ message: 'Role name cannot be empty' });
            }
            updateFields.name = req.body.name.trim();
        }

        // Check if qCode is provided but empty
        if (req.body.qCode !== undefined) {
            if (!req.body.qCode.trim()) {
                return res.status(400).json({ message: 'Role qCode cannot be empty' });
            }
            updateFields.qCode = req.body.qCode.trim();
        }

        if (req.body.permissions && !Array.isArray(req.body.permissions)) {
            return res.status(400).json({ message: 'Permissions must be an array' });
        }

        // Check for duplicates only if name or qCode is being updated
        if (updateFields.name || updateFields.qCode) {
            const duplicateRole = await Role.findOne({
                _id: { $ne: req.params.roleId },
                $or: [
                    { name: updateFields.name },
                    { qCode: updateFields.qCode }
                ]
            });

            if (duplicateRole) {
                return res.status(400).json({
                    message: duplicateRole.name === updateFields.name
                        ? 'Role name already exists'
                        : 'Role qCode already exists'
                });
            }
        }

        if (req.body.description) updateFields.description = req.body.description;
        if (req.body.permissions) updateFields.permissions = req.body.permissions;

        const role = await Role.findByIdAndUpdate(req.params.roleId, updateFields, { new: true, runValidators: true });
        if (!role) {
            return res.status(404).json({ message: 'Role not found' });
        }
        res.status(200).json({ message: 'Role updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//@desc     Delete a role
//@route    DELETE /api/roles/:roleId
//@access   Private
exports.deleteRole = async (req, res) => {
    try {
        // First find the role to check if it exists
        const role = await Role.findById(req.params.roleId);
        if (!role) {
            return res.status(404).json({
                message: 'Role not found'
            });
        }

        // Check if role is assigned to any users
        const userWithRole = await User.findOne({ role: req.params.roleId });
        if (userWithRole) {
            return res.status(400).json({ 
                message: 'Cannot delete role as it is assigned to one or more users. Please remove it from all users first.' 
            });
        }

        await Role.findByIdAndDelete(req.params.roleId);
        res.json({ message: 'Role deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

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