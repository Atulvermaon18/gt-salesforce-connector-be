const FlowMetadata = require('../models/flowMetadata.js');
const SalesforceToken = require('../models/salesforceOrgModel.js');
const { n8nSalesforceApiRequest } = require('../salesforceServices/tokenServices.js');
exports.configMetadata = async (req, res) => {
  try {
    const { orgId, metadata, id ,configurationName,associatedPages,n8n_url} = req.body;  

    if (!orgId || !metadata) {
      return res.status(400).json({ error: "Missing required fields: orgId or metadata" });
    }

    const existingByOrg = await FlowMetadata.find({ orgId });
    const existingById = id ? await FlowMetadata.findById(id) : null;

 
    if (!existingByOrg.length || !existingById) {
      const newMetadata = new FlowMetadata({
        orgId,
        configurationName,
        metadata,
        associatedPages,
        n8n_url,
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
      existingById.associatedPages=associatedPages
      existingById.n8n_url=n8n_url
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
        const {orgId,id,recordObjectId}=req.body
        let {processData}=req.body
        const org=await SalesforceToken.findOne({ orgId });
        const {metadata,n8n_url}=await FlowMetadata.findOne({orgId,_id:id})
        

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
            if(input.actionType=='GET_RECORD'){
              const objectApiName = input.options[0]
              const fields = input.options[1].join(',');
              const query = `SELECT ${fields} FROM ${objectApiName}`;
              const apiResponse = await n8nSalesforceApiRequest({
                method: 'post',
                url: process.env.N8N_URL,
                data: {
                  query: query,
                  endpoint: "query"
                },
              });
            
                processData[input.apiName ]=apiResponse
              
            }
        }
        if(n8n_url){  
          const axiosConfig = {
            method: 'get',
            url: n8n_url,
            headers: {
              'Content-Type': 'application/json',
            },
         data:processData
          };
          const n8nresponse = await n8nSalesforceApiRequest(axiosConfig);
     
        }
    
        res.status(200).json(metadata)
    }
    catch(error){
        console.log(error)
    }




}




exports.getAssignedFlow = async (req, res) => {
  try {
    const orgId = req.query.orgId;
    const objectApiName = req.query.objectApiName;

    const metadata = await FlowMetadata.find({ orgId });

    const data = metadata
      .filter(item => item?.associatedPages.includes(objectApiName))
      .map(item => ({
        name: item.configurationName,
        id: item._id
      }));

    res.status(200).json({ assignmentFlows: data });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};
exports.deleteMetadata = async (req, res) => {
  try {
    const { id } = req.params;

    
    const deleted = await FlowMetadata.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Metadata not found" });
    }

    return res.status(200).json({ success: true, message: "Metadata deleted successfully" });
  } catch (error) {
    console.error("Error deleting metadata:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
