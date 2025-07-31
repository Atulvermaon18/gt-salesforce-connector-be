const FlowMetadata = require('../models/flowMetadata.js');

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
