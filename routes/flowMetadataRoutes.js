const express=require('express')
const metadataControler= require('../controllers/flowMetadataController.js');
const router=express.Router()

router.get('/',metadataControler.getMetadata)
router.get('/assignedflows',metadataControler.getAssignedFlow)
router.get('/:id',metadataControler.getMetadataById)
router.post('/configuration',metadataControler.configMetadata)
router.post('/process',metadataControler.processMetadata)

module.exports=router