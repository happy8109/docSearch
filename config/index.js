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

// 支持多目录监控：兼容旧版单目录字符串和新版数组格式
function resolveDocDirectories() {
  // 新版数组格式
  if (Array.isArray(userConfig.docDirectories) && userConfig.docDirectories.length > 0) {
    return userConfig.docDirectories.map(dir => path.resolve(__dirname, '..', dir));
  }
  // 向下兼容旧版单目录字符串
  if (userConfig.docRelativeDirectory) {
    return [path.resolve(__dirname, '..', userConfig.docRelativeDirectory)];
  }
  // 默认
  return [path.resolve(__dirname, '..', '../data')];
}

// 优先级：命令行参数 > 配置文件 > 默认值
function resolvePort() {
  const portArg = process.argv.find(arg => arg.startsWith('--port='));
  if (portArg) {
    return parseInt(portArg.split('=')[1]);
  }
  const pArg = process.argv.indexOf('-p');
  if (pArg !== -1 && process.argv[pArg + 1]) {
    return parseInt(process.argv[pArg + 1]);
  }
  return userConfig.port || 3004;
}

// 优先级：命令行参数 > 配置文件
function resolveRemoteMode() {
  const remoteArg = process.argv.find(arg => arg.startsWith('--remote='));
  if (remoteArg) {
    return remoteArg.split('=')[1] === 'true';
  }
  if (process.argv.includes('--remote')) {
    return true;
  }
  return !!userConfig.isRemoteMode;
}

module.exports = {
  // 服务监听端口
  port: resolvePort(),
  
  // 是否为远程模式
  isRemoteMode: resolveRemoteMode(),

  // 远程数据库 API 地址
  remoteDbUrl: userConfig.remoteDbUrl || '',

  // 状态轮询间隔 (秒)
  statusPollInterval: userConfig.statusPollInterval || 30,

  // SQLite 数据库文件存放路径 (相对于项目根目录)
  dbPath: path.resolve(__dirname, '..', userConfig.dbRelativePath || 'db/doc_search.db'),
  
  // 被扫描与监听的存放报告的目录列表（支持多目录）
  docDirectories: resolveDocDirectories(),
  
  // 支持解析与索引的扩展名
  supportedExtensions: userConfig.supportedExtensions || ['.doc', '.docx'],
  
  // 分页的默认条数
  defaultPageLimit: userConfig.defaultPageLimit || 10,
};
