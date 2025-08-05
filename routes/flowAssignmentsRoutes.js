const express=require('express')
const flowAssignmentsController= require('../controllers/flowAssignmentsController.js');
const router=express.Router()

router.post('/',flowAssignmentsController.manageFlowAssignments) 
router.get('/',flowAssignmentsController.getFlowAssignments) 
router.get('/assignedFlows',flowAssignmentsController.getAssignedFlow) 
 

module.exports=router