const dbModule = require('../models/db');
const { tokenize } = require('../utils/tokenizer');
const config = require('../../config');
const path = require('path');
const fs = require('fs');

async function searchDocuments(query, page = 1, limit = 10) {
  const db = await dbModule.getDb();
  
  const tokenizedQuery = tokenize(query);
  if (!tokenizedQuery) {
    return { data: [], total: 0, page, limit };
  }

  // Build MATCH phrase. Example: `"搜索" "测试"`
  const matchWords = tokenizedQuery.split(' ').map(w => `"${w}"`).join(' ');
  const offset = (page - 1) * limit;

  // Retrieve total count
  const countRow = await db.get(`
    SELECT COUNT(*) as count 
    FROM documents_fts 
    WHERE documents_fts MATCH ?
  `, [matchWords]);
  const total = countRow ? countRow.count : 0;

  // Retrieve matched documents with raw content for snippet generation
  const rows = await db.all(`
    SELECT 
      fts.doc_id as id,
      d.filename,
      d.filepath,
      d.mtime,
      d.raw_content
    FROM documents_fts fts
    JOIN documents d ON fts.doc_id = d.id
    WHERE documents_fts MATCH ?
    ORDER BY rank
    LIMIT ? OFFSET ?
  `, [matchWords, limit, offset]);

  // Generate clean snippets from raw_content using the original query keywords
  const keywords = query.trim().split(/\s+/).filter(k => k.length > 0);

  const cleanRows = rows.map(r => ({
    id: r.id,
    filename: r.filename,
    filepath: r.filepath,
    absolutePath: resolveAbsolutePath(r.filepath),
    mtime: r.mtime,
    snippet: generateSnippet(r.raw_content || '', keywords, 120)
  }));

  return {
    data: cleanRows,
    total,
    page,
    limit
  };
}

/**
 * Generate a snippet from raw text by locating the first keyword match
 * and extracting surrounding context with <b> highlighting.
 */
function generateSnippet(text, keywords, maxLen) {
  if (!text || keywords.length === 0) return '';

  // Normalize whitespace
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '';

  // Build a regex to find the first occurrence of any keyword
  const escaped = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi');

  // Find the first match position
  const firstMatch = pattern.exec(clean);
  let startPos = 0;

  if (firstMatch) {
    // Center the snippet around the first match
    startPos = Math.max(0, firstMatch.index - Math.floor(maxLen / 3));
  }

  // Extract the raw snippet window
  let snippet = clean.substring(startPos, startPos + maxLen);
  
  // Add ellipsis
  let prefix = startPos > 0 ? '...' : '';
  let suffix = (startPos + maxLen) < clean.length ? '...' : '';

  // Escape HTML entities
  snippet = snippet
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Highlight all keyword occurrences with <b> tags
  const highlightPattern = new RegExp(
    `(${escaped.map(e => e.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('|')})`,
    'gi'
  );
  snippet = snippet.replace(highlightPattern, '<b>$1</b>');

  return prefix + snippet + suffix;
}

/**
 * Resolve a relative filepath to its absolute path by checking all configured directories.
 */
function resolveAbsolutePath(filepath) {
  for (const dir of config.docDirectories) {
    const candidate = path.join(dir, filepath);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  // Fallback: use first directory
  return path.join(config.docDirectories[0], filepath);
}

module.exports = { searchDocuments };
