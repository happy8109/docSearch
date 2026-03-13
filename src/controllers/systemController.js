const dbModule = require('../models/db');
const config = require('../../config');

async function getSystemStatus(req, res, next) {
  try {
    const db = await dbModule.getDb();
    const countRow = await db.get('SELECT COUNT(*) as count FROM documents');
    
    res.json({
      status: 'running',
      documentCount: countRow ? countRow.count : 0,
      docDirectory: config.docDirectory,
      dbPath: config.dbPath,
      uptime: process.uptime()
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getSystemStatus };
