const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const dbModule = require('../models/db');
const { extractText } = require('../parser');
const { tokenize } = require('../utils/tokenizer');
const config = require('../../config');
const logger = require('../utils/logger');

let watcher = null;

async function processFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!config.supportedExtensions.includes(ext)) return;

  const db = await dbModule.getDb();
  const relativePath = path.relative(config.docDirectory, filePath);
  const filename = path.basename(filePath);
  
  try {
    const stats = fs.statSync(filePath);
    const mtime = Math.floor(stats.mtimeMs);

    // Skip if unchanged based on mtime
    const existing = await db.get('SELECT id, mtime FROM documents WHERE filepath = ?', [relativePath]);
    if (existing && existing.mtime >= mtime) {
      return;
    }

    logger.debug(`[Sync] Parsing & Indexing: ${relativePath}`);
    const rawContent = await extractText(filePath);
    const tokenizedContent = tokenize(rawContent);
    const tokenizedTitle = tokenize(filename);

    await db.exec('BEGIN TRANSACTION');
    
    if (existing) {
      await db.run(
        'UPDATE documents SET mtime = ?, raw_content = ?, filename = ? WHERE id = ?',
        [mtime, rawContent, filename, existing.id]
      );
      await db.run(
        'UPDATE documents_fts SET title = ?, content = ? WHERE doc_id = ?',
        [tokenizedTitle, tokenizedContent, existing.id]
      );
    } else {
      const result = await db.run(
        'INSERT INTO documents (filepath, filename, mtime, raw_content) VALUES (?, ?, ?, ?)',
        [relativePath, filename, mtime, rawContent]
      );
      const docId = result.lastID;
      await db.run(
        'INSERT INTO documents_fts (title, content, doc_id) VALUES (?, ?, ?)',
        [tokenizedTitle, tokenizedContent, docId]
      );
    }
    
    await db.exec('COMMIT');
    logger.info(`[Sync] Finished Indexing: ${relativePath}`);

  } catch (error) {
    await db.exec('ROLLBACK').catch(() => {});
    logger.error(`[Sync] Error indexing ${relativePath}:`, error);
  }
}

async function removeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!config.supportedExtensions.includes(ext)) return;

  const db = await dbModule.getDb();
  const relativePath = path.relative(config.docDirectory, filePath);

  try {
    const existing = await db.get('SELECT id FROM documents WHERE filepath = ?', [relativePath]);
    if (existing) {
      await db.exec('BEGIN TRANSACTION');
      await db.run('DELETE FROM documents WHERE id = ?', [existing.id]);
      await db.run('DELETE FROM documents_fts WHERE doc_id = ?', [existing.id]);
      await db.exec('COMMIT');
      logger.info(`[Sync] Removed from index: ${relativePath}`);
    }
  } catch (error) {
    await db.exec('ROLLBACK').catch(() => {});
    logger.error(`[Sync] Error removing ${relativePath}:`, error);
  }
}

function start(dirPath) {
  if (watcher) return;
  logger.info(`[Sync] Starting watcher on directory: ${dirPath}`);
  
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  watcher = chokidar.watch(dirPath, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  });

  watcher
    .on('add', (filePath) => processFile(filePath))
    .on('change', (filePath) => processFile(filePath))
    .on('unlink', (filePath) => removeFile(filePath))
    .on('error', (error) => logger.error(`[Sync] Watcher error:`, error));
}

module.exports = { start };
