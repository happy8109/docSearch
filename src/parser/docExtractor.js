const WordExtractor = require("word-extractor");

/**
 * Extract text from old .doc files using pure Javascript word-extractor
 */
async function extractDoc(filePath) {
  const extractor = new WordExtractor();
  try {
    const extracted = await extractor.extract(filePath);
    return extracted.getBody();
  } catch (error) {
    console.error(`[Parser - DOC] Error extracting ${filePath}`, error.message);
    throw error;
  }
}

module.exports = { extractDoc };
