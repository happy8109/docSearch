const textract = require("textract");

/**
 * Extract text from .docx files using textract
 */
function extractDocx(filePath) {
  return new Promise((resolve, reject) => {
    textract.fromFileWithPath(filePath, { preserveLineBreaks: true }, (error, text) => {
      if (error) {
        console.error(`[Parser - DOCX] Error extracting ${filePath}`, error.message);
        return reject(error);
      }
      resolve(text);
    });
  });
}

module.exports = { extractDocx };
