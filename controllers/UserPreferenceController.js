const mongoose = require('mongoose');
const createError = require('http-errors');
const axios = require('axios');
const SalesforceToken = require('../models/salesforceOrgModel.js');
const UserPreference = require('../models/UserPreferenceModel');
const { n8nSalesforceApiRequest } = require('../salesforceServices/tokenServices.js');
const SObject = require('../models/sobjectModel.js');


exports.getUserPreference = async (req, res) => {
  try {
    const orgId=req.query.orgId
    const userPreferences = await UserPreference.find({orgId});
 
    if (!userPreferences.length || !userPreferences[0].preferences?.selectedSobjects?.length) {
      return res.status(200).json([]);
    }

    // Convert strings to ObjectId instances using the new syntax
    const objectIds = userPreferences[0].preferences.selectedSobjects.map(id => new mongoose.Types.ObjectId(id));
      
  
    // Query MongoDB
    const sobjects = await SObject.find({ _id: { $in: objectIds } });
    
    res.status(200).json(sobjects);

    
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};



exports.postUserPreference= async(req,res) =>{
    const {selectedSobjects,orgId}=req.body

    try{
        const existingPreference=await UserPreference.findOne({orgId})
        if(existingPreference){
            existingPreference.preferences.selectedSobjects=selectedSobjects
            await existingPreference.save()
        }
        else{
            const userPreference=new UserPreference({
                orgId,
                preferences:{
                    selectedSobjects
                }
            })
            await userPreference.save()
        }
        res.status(200).json(
         {
            
         }
        )
    }
    catch(error){
console.log(error)
    }
}
