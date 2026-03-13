const dbModule = require('../models/db');
const config = require('../../config');
const pkg = require('../../package.json');

async function getSystemStatus(req, res, next) {
  try {
    const db = await dbModule.getDb();
    const countRow = await db.get('SELECT COUNT(*) as count FROM documents');
    
    res.json({
      status: 'running',
      version: pkg.version,
      documentCount: countRow ? countRow.count : 0,
      docDirectories: config.docDirectories,
      dbPath: config.dbPath,
      uptime: process.uptime()
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getSystemStatus };
