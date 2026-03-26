const http = require('http');
const DatabaseAdapter = require('../database.adapter');
const logger = require('../../utils/logger');

/**
 * 远程 RSE 只读驱动实现
 * 将数据库操作封装为 HTTP 请求发送至远程 RSE 端点
 */
class RemoteDriver extends DatabaseAdapter {
  constructor(config) {
    super();
    this.config = config;
    this.apiUrl = config.remoteDbUrl;
    this.timeout = 15000; // 默认 15 秒
  }

  async init() {
    logger.info(`[RSE] Remote mode enabled. Using endpoint: ${this.apiUrl}`);
    if (!this.apiUrl) {
      throw new Error('remoteDbUrl is not configured in remote mode.');
    }
    
    // 关键修复：异步发起连接探测，不阻塞 server.js 的启动流程 (RSE §4.5)
    // 这样前端发起 system/status 请求时，后端已经处于监听状态
    this._request('SELECT 1').then(() => {
      logger.info('[RSE] Remote connection verified successfully.');
    }).catch(err => {
      logger.warn(`[RSE] Initial connection check failed: ${err.message}. System will retry automatically.`);
    });

    return true; 
  }

  /**
   * 发送远程 SQL 执行请求
   */
  async _request(sql, params = []) {
    // 带宽优化：严禁 SELECT * (RSE §4.1)
    if (sql.trim().toUpperCase().includes('SELECT *')) {
      throw new Error('[RSE] Bandwidth Optimization: "SELECT *" is forbidden. Please list specific fields.');
    }

    // 远程模式只读策略：拦截除 SELECT 以外的写指令
    const isQuery = sql.trim().toUpperCase().startsWith('SELECT') || 
                    sql.trim().toUpperCase().startsWith('PRAGMA') ||
                    sql.trim().toUpperCase().startsWith('WITH');
    
    if (!isQuery) {
      logger.warn(`[RSE] Write operation blocked in remote mode: ${sql.substring(0, 50)}...`);
      throw new Error('[RSE] Safety Policy: Write operations are forbidden in remote mode.');
    }

    return new Promise((resolve, reject) => {
      let isHandled = false; // 状态保护：确保每个 Promise 仅处理一次，防止回调堆叠产生刷屏

      const url = new URL(this.apiUrl);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'close' 
        },
        timeout: this.timeout
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          if (isHandled) return;
          isHandled = true;
          try {
            const response = JSON.parse(body);
            if (response.success) {
              resolve(response.data);
            } else {
              reject(new Error(response.error || 'Unknown RSE error'));
            }
          } catch (e) {
            reject(new Error(`[RSE] Parse Error: ${e.message}`));
          }
        });
      });

      // 彻底处理网络错误与超时，防止 Socket 挂起
      req.on('error', (e) => {
        if (isHandled) return;
        isHandled = true;
        reject(new Error(`[RSE] Network error: ${e.message}`));
      });

      req.on('timeout', () => {
        if (isHandled) return;
        const err = new Error(`[RSE] Request timeout (${this.timeout}ms)`);
        req.destroy(err); // 显式销毁请求以立即释放资源
      });

      req.write(JSON.stringify({ sql, params }));
      req.end();
    });
  }

  async get(sql, params = []) {
    const data = await this._request(sql, params);
    return Array.isArray(data) ? data[0] : undefined;
  }

  async all(sql, params = []) {
    return await this._request(sql, params);
  }

  async run(sql, params = []) {
    // 远程驱动层封堵写操作
    throw new Error('[RSE] Write operations (run) are blocked in remote mode.');
  }

  async exec(sql) {
    // 远程模式下 DDL 和 事务由 A 网管理，B 网跳过
    logger.debug(`[RSE] Skipping exec in remote mode: ${sql.substring(0, 30)}...`);
    return true;
  }

  async close() {
    return true;
  }
}

module.exports = RemoteDriver;
