const express = require('express')

const UserPreference = require('../controllers/UserPreferenceController');
const router = express.Router()

router.get('/', UserPreference.getUserPreference)
router.post('/sobjects', UserPreference.postUserPreference)
module.exports = router;