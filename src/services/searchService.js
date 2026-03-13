const dbModule = require('../models/db');
const { tokenize } = require('../utils/tokenizer');

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

  // Retrieve highlighted docs
  const rows = await db.all(`
    SELECT 
      fts.doc_id as id,
      d.filename,
      d.filepath,
      d.mtime,
      snippet(documents_fts, 1, '<b>', '</b>', '...', 64) as snippet
    FROM documents_fts fts
    JOIN documents d ON fts.doc_id = d.id
    WHERE documents_fts MATCH ?
    ORDER BY rank
    LIMIT ? OFFSET ?
  `, [matchWords, limit, offset]);

  // Clean the artificial spaces inside snippet inserted by nodejieba logic
  const cleanRows = rows.map(r => ({
    ...r,
    snippet: (r.snippet || '').replace(/ /g, '')
  }));

  return {
    data: cleanRows,
    total,
    page,
    limit
  };
}

module.exports = { searchDocuments };
