const mongoose = require('mongoose');
const withBaseSchema = require('./baseSchema.js');

const companySchema = withBaseSchema({
    name: { type: String, required: true },
});


const Company = mongoose.model("Companys", companySchema);
module.exports = Company;