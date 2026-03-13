const dbModule = require('../models/db');
const config = require('../../config');
const path = require('path');
const fs = require('fs');

async function getDocumentText(req, res, next) {
  try {
    const id = req.params.id;
    const db = await dbModule.getDb();
    const doc = await db.get('SELECT filename, filepath, raw_content FROM documents WHERE id = ?', [id]);
    
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      title: doc.filename,
      path: doc.filepath,
      content: doc.raw_content
    });
  } catch (error) {
    next(error);
  }
}

async function downloadDocument(req, res, next) {
  try {
    const id = req.params.id;
    const db = await dbModule.getDb();
    const doc = await db.get('SELECT filename, filepath FROM documents WHERE id = ?', [id]);
    
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const absolutePath = path.join(config.docDirectory, doc.filepath);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'Physical file not found on server' });
    }

    res.download(absolutePath, doc.filename);
  } catch (error) {
    next(error);
  }
}

module.exports = { getDocumentText, downloadDocument };
