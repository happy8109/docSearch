const WordExtractor = require("word-extractor");
const logger = require('../utils/logger');

/**
 * Extract text from old .doc files using pure Javascript word-extractor
 */
async function extractDoc(filePath) {
  const extractor = new WordExtractor();
  try {
    const extracted = await extractor.extract(filePath);
    return extracted.getBody();
  } catch (error) {
    logger.error(`[Parser - DOC] Error extracting ${filePath}`, error);
    throw error;
  }
}

module.exports = { extractDoc };
