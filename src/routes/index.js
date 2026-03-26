const express = require('express');
const router = express.Router();

const searchController = require('../controllers/searchController');
const documentController = require('../controllers/documentController');
const systemController = require('../controllers/systemController');
const sqlBridgeController = require('../controllers/sqlBridgeController');

router.get('/search', searchController.search);
router.get('/document/:id/text', documentController.getDocumentText);
router.get('/document/:id/download', documentController.downloadDocument);
router.get('/system/status', systemController.getSystemStatus);

const config = require('../../config');

// RSE 远程 SQL 接口: 仅限本地模式 (A网) 启用，防止错误配置导致自我查询的死循环
if (config.isRemoteMode) {
  router.post('/sql', (req, res) => {
    res.status(403).json({ 
      success: false, 
      error: '[RSE] SQL Bridge Endpoint is disabled in remote mode to prevent query loops.' 
    });
  });
} else {
  router.post('/sql', sqlBridgeController.execute);
}

module.exports = router;
