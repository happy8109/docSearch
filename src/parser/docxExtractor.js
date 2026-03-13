const textract = require("textract");
const logger = require('../utils/logger');

/**
 * Extract text from .docx files using textract
 */
function extractDocx(filePath) {
  return new Promise((resolve, reject) => {
    textract.fromFileWithPath(filePath, { preserveLineBreaks: true }, (error, text) => {
      if (error) {
        logger.error(`[Parser - DOCX] Error extracting ${filePath}`, error);
        return reject(error);
      }
      resolve(text);
    });
  });
}

module.exports = { extractDocx };
