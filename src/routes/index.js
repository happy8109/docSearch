const express = require('express');
const router = express.Router();

const searchController = require('../controllers/searchController');
const documentController = require('../controllers/documentController');
const systemController = require('../controllers/systemController');

router.get('/search', searchController.search);
router.get('/document/:id/text', documentController.getDocumentText);
router.get('/document/:id/download', documentController.downloadDocument);
router.get('/system/status', systemController.getSystemStatus);

module.exports = router;
