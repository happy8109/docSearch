const app = require('./app');
const config = require('../config');

const db = require('./models/db');
const syncService = require('./services/syncService');

async function startServer() {
  try {
    // 1. 初始化 SQLite 数据库及 FTS5 虚拟表
    await db.init();
    console.log('[Server] Database initialized.');

    // 2. 启动基于 chokidar 的文件监听和扫描服务
    syncService.start(config.docDirectory);
    console.log('[Server] Document sync service started.');

    // 3. 启动 HTTP 服务
    app.listen(config.port, () => {
      console.log(`[Server] Doc Search Engine running on http://localhost:${config.port}`);
      console.log(`[Config] Watching directory : ${config.docDirectory}`);
      console.log(`[Config] Database location : ${config.dbPath}`);
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

startServer();
