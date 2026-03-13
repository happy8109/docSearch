const path = require("path");
const { extractDoc } = require("./docExtractor");
const { extractDocx } = require("./docxExtractor");

/**
 * Main switch for extracting text based on file extension
 */
async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".doc") {
    return await extractDoc(filePath);
  } else if (ext === ".docx") {
    return await extractDocx(filePath);
  } else {
    throw new Error(`Unsupported file extension for parsing: ${ext}`);
  }
}

module.exports = { extractText };
