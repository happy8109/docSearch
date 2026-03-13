const { Jieba } = require('@node-rs/jieba');

// Initialize with default dictionaries
const jieba = new Jieba();

/**
 * Tokenize string for SQLite FTS5 matching.
 * SQLite FTS5 uses a space to separate tokens.
 */
function tokenize(text) {
  if (!text) return '';
  // cutForSearch returns an array of segments
  const words = jieba.cutForSearch(text);
  return words.join(' ');
}

module.exports = { tokenize };
