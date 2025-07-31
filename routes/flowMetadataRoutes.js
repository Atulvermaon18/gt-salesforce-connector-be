const express=require('express')
const metadataControler= require('../controllers/flowMetadataController.js');
const router=express.Router()

router.get('/',metadataControler.getMetadata)
router.get('/:id',metadataControler.getMetadataById)
router.post('/configuration',metadataControler.configMetadata)

module.exports=router