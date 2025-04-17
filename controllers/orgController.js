const Company = require('../models/companyModel');
const asyncHandler = require('express-async-handler');

//@desc     Create a new company
//@route    POST /api/companies
//@access   Private/Admin
exports.createCompany = asyncHandler(async (req, res) => {
    try {
        const { name } = req.body;

        // Validate input
        if (!name) {
            return res.status(400).json({ message: "Company name is required" });
        }

        // Check if the company already exists
        const existingCompany = await Company.findOne({ name });
        if (existingCompany) {
            return res.status(400).json({ message: "Company already exists" });
        }

        // Create the new company
        const newCompany = await Company.create({ name });

        res.status(201).json({
            message: "Company created successfully",
            company: newCompany,
        });
    } catch (error) {
        console.error("Error creating company:", error.message);
        res.status(500).json({ message: "Error creating company" });
    }
});


