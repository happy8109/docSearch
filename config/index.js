const path = require('path');
const fs = require('fs');

const configPath = path.join(__dirname, 'app.config.json');
let userConfig = {};

try {
  const configFile = fs.readFileSync(configPath, 'utf8');
  userConfig = JSON.parse(configFile);
} catch (error) {
  console.error('[Config] Failed to load app.config.json, using fallback defaults.', error.message);
}

module.exports = {
  // 服务监听端口
  port: userConfig.port || 3004,
  
  // SQLite 数据库文件存放路径 (相对于项目根目录)
  dbPath: path.resolve(__dirname, '..', userConfig.dbRelativePath || 'db/doc_search.db'),
  
  // 被扫描与监听的存放报告的根目录 (相对于项目根目录)
  docDirectory: path.resolve(__dirname, '..', userConfig.docRelativeDirectory || '../data'),
  
  // 支持解析与索引的扩展名
  supportedExtensions: userConfig.supportedExtensions || ['.doc', '.docx'],
  
  // 分页的默认条数
  defaultPageLimit: userConfig.defaultPageLimit || 10,
};
