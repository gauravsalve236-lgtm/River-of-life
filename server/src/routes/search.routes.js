const express = require('express');
const router = express.Router();
const { searchScriptures } = require('../controllers/searchController');

router.get('/', searchScriptures);

module.exports = router;
