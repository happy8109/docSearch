const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');
const DatabaseAdapter = require('../database.adapter');
const logger = require('../../utils/logger');

/**
 * 本地 SQLite 驱动实现
 */
class LocalDriver extends DatabaseAdapter {
  constructor(config) {
    super();
    this.config = config;
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;

    const dbDir = path.dirname(this.config.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = await open({
      filename: this.config.dbPath,
      driver: sqlite3.Database
    });

    await this.db.exec('PRAGMA foreign_keys = ON;');
    
    // 初始化表结构
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filepath TEXT UNIQUE NOT NULL,
        filename TEXT NOT NULL,
        mtime INTEGER NOT NULL,
        raw_content TEXT
      );
    `);

    await this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
        title,
        content,
        doc_id UNINDEXED,
        tokenize = 'unicode61'
      );
    `);

    logger.debug('[SQLite] Local database connected and schemas verified.');
    return this.db;
  }

  async get(sql, params = []) {
    return await this.db.get(sql, params);
  }

  async all(sql, params = []) {
    return await this.db.all(sql, params);
  }

  async run(sql, params = []) {
    return await this.db.run(sql, params);
  }

  async exec(sql) {
    return await this.db.exec(sql);
  }

  async close() {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

module.exports = LocalDriver;
