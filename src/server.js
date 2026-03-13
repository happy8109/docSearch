const app = require('./app');
const config = require('../config');
const logger = require('./utils/logger');

const db = require('./models/db');
const syncService = require('./services/syncService');

async function startServer() {
  try {
    // 1. 初始化 SQLite 数据库及 FTS5 虚拟表
    await db.init();
    logger.info('Database initialized.');

    // 2. 启动基于 chokidar 的文件监听和扫描服务
    syncService.start(config.docDirectory);
    logger.info('Document sync service started.');

    // 3. 启动 HTTP 服务
    app.listen(config.port, () => {
      logger.info(`Doc Search Engine running on http://localhost:${config.port}`);
      logger.info(`Watching directory : ${config.docDirectory}`);
      logger.info(`Database location : ${config.dbPath}`);
    });
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
}

startServer();
