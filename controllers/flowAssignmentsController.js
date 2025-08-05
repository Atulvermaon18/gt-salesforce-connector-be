const SalesforceToken = require('../models/salesforceOrgModel.js');
const FlowAssignments = require('../models/flowAssignmentsModel.js');
const FlowMetadata = require('../models/flowMetadata.js');
exports.manageFlowAssignments = async (req, res) => {
    try {
      const { orgId, flowAssignments } = req.body;
  
      const org = await SalesforceToken.findOne({ orgId });
      if (!org) {
        return res.status(404).json({ message: "Salesforce org not found" });
      }
   
      const existingFlowAssignments = await FlowAssignments.findOne({ orgId });
  
      if (existingFlowAssignments) { 
        existingFlowAssignments.flowAssignments=flowAssignments
        await existingFlowAssignments.save();
        return res.status(200).json({ message: "Flow assignments updated" });
      }
  
  
      const newFlowAssignments = new FlowAssignments({ orgId, flowAssignments });
      await newFlowAssignments.save();
      return res.status(200).json({ message: "Flow assignments created" });
  
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
     
exports.getFlowAssignments=async(req,res)=>{
   try {
    const {orgId}=req.query
    const org= await SalesforceToken.findOne({orgId})
    if(!org){
        return res.status(404).json({message:"Salesforce org not found"})
    }
    const data=await FlowAssignments.findOne({orgId})
  if(!data){
    return res.status(200).json({})
  }
  
  res.status(200).json(data)
   } catch (error) {
    console.error(error)
    return res.status(500).json({message:"Internal server error"})
   }
}

exports.getAssignedFlow=async(req,res)=>{
    try {
        const {orgId}=req.query
        const org= await SalesforceToken.findOne({orgId})
        if(!org){
            return res.status(404).json({message:"Salesforce org not found"})
        }
        const data=await FlowAssignments.findOne({orgId})
      if(!data){
        return res.status(200).json({})
      }
      
      let response=[]
      for (const item of data?.flowAssignments ?? []) {
        let flowItems = [];
        for (const flowId of item.flowIds) {
          const flow = await FlowMetadata.findOne({ orgId, _id: flowId });
          flowItems.push({ name: flow?.configurationName, id: flowId });
        }
        response=[...response,{sObject:item.sObject,flowItems:flowItems}]
      }

      res.status(200).json({assignmentFlows :response})
       } catch (error) {
        console.error(error)
        return res.status(500).json({message:"Internal server error"})
       }
    }