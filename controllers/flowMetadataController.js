const FlowMetadata = require('../models/flowMetadata.js');
const SalesforceToken = require('../models/salesforceOrgModel.js');
const { n8nSalesforceApiRequest } = require('../salesforceServices/tokenServices.js');
exports.configMetadata = async (req, res) => {
  try {
    const { orgId, metadata, id ,configurationName} = req.body;  

    if (!orgId || !metadata) {
      return res.status(400).json({ error: "Missing required fields: orgId or metadata" });
    }

    const existingByOrg = await FlowMetadata.find({ orgId });
    const existingById = id ? await FlowMetadata.findById(id) : null;

 
    if (!existingByOrg.length || !existingById) {
      const newMetadata = new FlowMetadata({
        orgId,
        configurationName,
        metadata
      });

      await newMetadata.save();
      return res.status(200).json({ message: "New metadata created", data: newMetadata });
    }

    //   ID provided and found  
    if (id && !existingById) {
      return res.status(404).json({ error: "Metadata with given ID not found" });
    }

    if (existingById) {
        existingById.configurationName=configurationName
      existingById.metadata = metadata;
      await existingById.save();
      return res.status(200).json({ message: "Metadata updated", data: existingById });
    }
 
  } catch (err) {
    console.error("Metadata error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};


exports.getMetadata=async(req,res)=>{
    try{
        const orgId=req.query.orgId
        const metadata=await FlowMetadata.find({orgId})
        res.status(200).json(metadata)
    }
    catch(error){
        console.log(error)
    }
}

exports.getMetadataById=async(req,res)=>{
    try{
        const id=req.params.id 
        const metadata=await FlowMetadata.findById(id)
   
        res.status(200).json(metadata)
    }
    catch(error){
        console.log(error)
    }
}


exports.processMetadata=async(req,res)=>{
    try{
        const {orgId,id,processData,recordObjectId}=req.body
        const org=await SalesforceToken.findOne({ orgId });
        const {metadata}=await FlowMetadata.findOne({orgId,_id:id})
        

        for(const input of metadata[0].inputs){
            if(input.actionType=='UPDATE_RECORD')
            {
                const{field,objectId,apiName}= input.setRecordObject 
                const  body={
                  [field]:processData[apiName]
                }
                const url = `${org.instanceUrl}/services/data/v57.0/sobjects/${objectId}/${recordObjectId}`; 
                payload = {
                  "url":url,
                  "method": "PATCH",
                  "endpoint":"record",
                  "body": body
                }
                const axiosConfig = {
                  method: 'post',
                  url: process.env.N8N_URL,
                  headers: {
                    'Content-Type': 'application/json',
                  },
               data: payload
                };
                const response = await n8nSalesforceApiRequest(axiosConfig);
                console.log(response)
            }
        }
        
    
        res.status(200).json(metadata)
    }
    catch(error){
        console.log(error)
    }
}
