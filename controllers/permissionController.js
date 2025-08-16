const Permission = require("../models/permissionModel.js");
const Role = require('../models/roleModel.js');

//@desc     Get all permissions
//@route    GET api/permissions
//@access   Public
exports.getPermissions = async (req, res) => {
    try {
        const permissions = await Permission.find().select('_id name description qCode sobject');
        res.json(permissions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//@desc     Create new permission
//@route    POST api/permissions
//@access   Private
exports.createPermission = async (req, res) => {
    try {
        // Check if name is empty
        if (!req.body.name || !req.body.name.trim()) {
            return res.status(400).json({ message: 'Permission name cannot be empty' });
        }
            if(req.body.name === "Super Admin"){
                return res.status(400).json({ message: 'Permission name cannot be Super Admin' });
            }
        // Check if qCode is empty
        // if (!req.body.qCode || !req.body.qCode.trim()) {
        //     return res.status(400).json({ message: 'Permission  cannot be empty' });
        // }

        // Check if permission with same name or qCode already exists
        const existingPermission = await Permission.findOne({
            $or: [
                { name: req.body.name.trim() }, 
            ]
        });

        if (existingPermission) {
            return res.status(400).json({
                message: existingPermission.name === req.body.name.trim()
                    ? 'Permission name already exists'
                    : 'Permission qCode already exists'
            });
        }

        const permission = new Permission({
            name: req.body.name.trim(),
            description: req.body.description, 
            // qCode: req.body.qCode.trim(),
            sobject: req.body.sobject,
            
        });
        await permission.save();
        res.status(201).json({ message: 'Permission created successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//@desc     Update permission
//@route    PUT api/permissions/:permissionId
//@access   Private
exports.updatePermission = async (req, res) => {
    try {
        const updateFields = {};

        // Check if name is provided but empty
        if (req.body.name !== undefined) {
            if (!req.body.name.trim()) {
                return res.status(400).json({ message: 'Permission name cannot be empty' });
            }
            updateFields.name = req.body.name.trim();
        }

        if (req.body.description) {
            updateFields.description = req.body.description;
        }

        if (req.body.sobject) {
            updateFields.sobject = req.body.sobject;
        }

        // Check if permission exists
        const existingPermission = await Permission.findById(req.params.permissionId);
        if (!existingPermission) {
            return res.status(404).json({ message: 'Permission not found' });
        }

        // Check for duplicates only if name or qCode is being updated
        if (updateFields.name || updateFields.qCode) {
            const duplicatePermission = await Permission.findOne({
                _id: { $ne: req.params.permissionId },
                $or: [
                    { name: updateFields.name || existingPermission.name },
                    { qCode: updateFields.qCode || existingPermission.qCode }
                ]
            });

            if (duplicatePermission) {
                return res.status(400).json({
                    message: duplicatePermission.name === (updateFields.name || existingPermission.name)
                        ? 'Permission name already exists'
                        : 'Permission qCode already exists'
                });
            }
        }

        const permission = await Permission.findByIdAndUpdate(
            req.params.permissionId,
            updateFields,
            { new: true, runValidators: true }
        );

        res.status(200).json({ message: 'Permission updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//@desc     Delete permission
//@route    DELETE api/permissions/:permissionId
//@access   Private
exports.deletePermission = async (req, res) => {
    try {
        // Check if permission exists before trying to delete
        const permission = await Permission.findById(req.params.permissionId);
        if (!permission) {
            return res.status(404).json({ message: 'Permission not found' });
        }

        // Check if permission is being used by any roles
        const roleWithPermission = await Role.findOne({ permissions: req.params.permissionId });
        if (roleWithPermission) {
            return res.status(400).json({ 
                message: 'Cannot delete permission as it is assigned to one or more roles. Please remove it from all roles first.' 
            });
        }

        await Permission.findByIdAndDelete(req.params.permissionId);
        res.status(200).json({ message: 'Permission deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
