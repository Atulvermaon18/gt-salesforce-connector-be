const mongoose=require('mongoose') 
const flowmetadataSchema=new mongoose.Schema([
    {
        orgId:{type:String,required:true},
        configurationName:{type:String,required:true},
        metadata:{type:mongoose.Schema.Types.Mixed,required:true},
        associatedPages:[{type:String}],
        n8n_url:{type:String}
        }
],{timestamps:true})
const metadata=mongoose.model('flowmetadata',flowmetadataSchema)
module.exports=metadata