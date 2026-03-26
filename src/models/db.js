const config = require('../../config');
const LocalDriver = require('./drivers/local.driver');
const RemoteDriver = require('./drivers/remote.driver');
const logger = require('../utils/logger');

let dbInstance = null;

/**
 * 初始化数据库适配器
 * 根据 config.isRemoteMode 决定使用本地驱动或远程驱动
 */
async function init() {
  if (dbInstance) return dbInstance;

  try {
    if (config.isRemoteMode) {
      logger.info('[DB] Initializing Remote RSE Driver...');
      dbInstance = new RemoteDriver(config);
    } else {
      logger.info('[DB] Initializing Local SQLite Driver...');
      dbInstance = new LocalDriver(config);
    }

    await dbInstance.init();
    return dbInstance;
  } catch (error) {
    logger.error('[DB] Failed to initialize database driver:', error);
    throw error;
  }
}

/**
 * 获取当前数据库实例
 */
async function getDb() {
  if (!dbInstance) {
    return await init();
  }
  return dbInstance;
}

module.exports = {
  init,
  getDb
};
