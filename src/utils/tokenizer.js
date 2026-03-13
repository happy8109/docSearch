const nodejieba = require('nodejieba');

/**
 * Tokenize string for SQLite FTS5 matching.
 * SQLite FTS5 uses a space to separate tokens.
 */
function tokenize(text) {
  if (!text) return '';
  // nodejieba.cutForSearch returns an array of segments
  const words = nodejieba.cutForSearch(text);
  return words.join(' ');
}

module.exports = { tokenize };
