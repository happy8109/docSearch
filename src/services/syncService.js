const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const dbModule = require('../models/db');
const { extractText } = require('../parser');
const { tokenize } = require('../utils/tokenizer');
const config = require('../../config');
const logger = require('../utils/logger');

let watcher = null;
const syncQueue = [];
let isProcessingQueue = false;

async function addToQueue(filePath, action) {
  syncQueue.push({ filePath, action });
  processQueue();
}

async function processQueue() {
  if (isProcessingQueue || syncQueue.length === 0) return;
  isProcessingQueue = true;

  while (syncQueue.length > 0) {
    const { filePath, action } = syncQueue.shift();
    if (action === 'add' || action === 'change') {
      await processFile(filePath);
    } else if (action === 'unlink') {
      await removeFile(filePath);
    }
  }

  isProcessingQueue = false;
}

async function processFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!config.supportedExtensions.includes(ext)) return;

  const db = await dbModule.getDb();
  const baseDir = findBaseDir(filePath);
  const relativePath = baseDir ? path.relative(baseDir, filePath) : path.basename(filePath);
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
      await db.run('DELETE FROM documents_fts WHERE doc_id = ?', [existing.id]);
      await db.run(
        'INSERT INTO documents_fts (title, content, doc_id) VALUES (?, ?, ?)',
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
  const baseDir = findBaseDir(filePath);
  const relativePath = baseDir ? path.relative(baseDir, filePath) : path.basename(filePath);

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

// Find which base directory a file belongs to
function findBaseDir(filePath) {
  const normalizedFile = path.normalize(filePath).toLowerCase();
  for (const dir of config.docDirectories) {
    const normalizedDir = path.normalize(dir).toLowerCase();
    if (normalizedFile.startsWith(normalizedDir)) {
      return dir;
    }
  }
  return config.docDirectories[0];
}

function start(directories) {
  if (watcher) return;

  // Ensure all directories exist
  const dirs = Array.isArray(directories) ? directories : [directories];
  dirs.forEach(dirPath => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });

  logger.info(`[Sync] Starting watcher on ${dirs.length} director${dirs.length > 1 ? 'ies' : 'y'}:`);
  dirs.forEach(d => logger.info(`  -> ${d}`));

  watcher = chokidar.watch(dirs, {
    ignored: /(^|[\/\\])[\.~]/, // Ignore hidden files and MS Word temp lock files (~$)
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  });

  watcher
    .on('add', (filePath) => addToQueue(filePath, 'add'))
    .on('change', (filePath) => addToQueue(filePath, 'change'))
    .on('unlink', (filePath) => addToQueue(filePath, 'unlink'))
    .on('error', (error) => logger.error(`[Sync] Watcher error:`, error));
}

module.exports = { start };
