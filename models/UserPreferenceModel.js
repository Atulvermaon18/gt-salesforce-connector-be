const mongoose = require('mongoose');
 
const userPreferenceSchema=new mongoose.Schema({
   orgId:String,
   preferences:{
      selectedSobjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SObject' }]
   }
},{ timestamps: true})


const userPreference=mongoose.model('userPreference',userPreferenceSchema) 

module.exports=userPreference