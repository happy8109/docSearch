const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const config = require('../../config');
const fs = require('fs');
const path = require('path');

let dbInstance = null;

async function init() {
  if (dbInstance) return dbInstance;

  // Ensure database directory exists
  const dbDir = path.dirname(config.dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = await open({
    filename: config.dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await db.exec('PRAGMA foreign_keys = ON;');

  // Create metatable for true documents (with raw un-tokenized content for modal preview)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filepath TEXT UNIQUE NOT NULL,
      filename TEXT NOT NULL,
      mtime INTEGER NOT NULL,
      raw_content TEXT
    );
  `);

  // Create FTS5 virtual table for pre-tokenized search text
  // We use simple tokenizer because we tokenize Chinese strings into space-separated phrases ourselves
  await db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
      title,
      content,
      doc_id UNINDEXED,
      tokenize = 'unicode61'
    );
  `);

  console.log('[SQLite] Connected to database and verified schemas.');
  dbInstance = db;
  return dbInstance;
}

async function getDb() {
  if (!dbInstance) {
    return await init();
  }
  return dbInstance;
}

// Simple export of wrapper methods can also be placed here or in models
module.exports = {
  init,
  getDb
};
