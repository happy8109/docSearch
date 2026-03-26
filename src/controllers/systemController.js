const dbModule = require('../models/db');
const config = require('../../config');
const pkg = require('../../package.json');

async function getSystemStatus(req, res, next) {
  try {
    const db = await dbModule.getDb();
    const countRow = await db.get('SELECT COUNT(*) as count FROM documents');
    
    // Use DB file modification time as last indexed time
    const fs = require('fs');
    let lastIndexTime = null;
    try {
      const stats = fs.statSync(config.dbPath);
      lastIndexTime = stats.mtimeMs;
    } catch (e) {
      // ignore
    }

    res.json({
      status: 'running',
      version: pkg.version,
      isRemoteMode: config.isRemoteMode,
      statusPollInterval: config.statusPollInterval,
      documentCount: countRow ? countRow.count : 0,
      lastIndexTime: lastIndexTime,
      docDirectories: config.docDirectories,
      dbPath: config.dbPath,
      uptime: process.uptime()
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getSystemStatus };
