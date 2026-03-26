const app = require('./app');
const config = require('../config');
const logger = require('./utils/logger');

const db = require('./models/db');
const syncService = require('./services/syncService');

async function startServer() {
  try {
    // 1. 初始化数据库适配器 (本地驱动或远程驱动)
    await db.init();
    logger.info(`Database initialized in ${config.isRemoteMode ? 'REMOTE' : 'LOCAL'} mode.`);

    // 2. 只有在本地模式下才启动基于 chokidar 的文件监听和扫描服务 (写操作)
    if (!config.isRemoteMode) {
      syncService.start(config.docDirectories);
      logger.info('Document sync service started (LOCAL mode).');
    } else {
      logger.info('Document sync service skipped (REMOTE mode - Read Only).');
    }

    // 3. 启动 HTTP 服务
    app.listen(config.port, () => {
      logger.info(`Doc Search Engine [v${require('../package.json').version}] running on http://localhost:${config.port}`);
      if (!config.isRemoteMode) {
        logger.info(`Watching ${config.docDirectories.length} director${config.docDirectories.length > 1 ? 'ies' : 'y'}`);
        logger.info(`Local Database location: ${config.dbPath}`);
      } else {
        logger.info(`Remote RSE Endpoint: ${config.remoteDbUrl}`);
      }
    });
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
}

startServer();
