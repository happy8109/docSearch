const dbModule = require('../models/db');
const logger = require('../utils/logger');

/**
 * 远程 SQL 执行网桥控制器 (A网专用)
 * 符合 RSE 协议 §2 规范，接收 SQL 及其参数并返回统一 JSON 结果。
 */
async function execute(req, res, next) {
  try {
    const { sql, params } = req.body;

    if (!sql) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing SQL statement' 
      });
    }

    const db = await dbModule.getDb();
    let result;

    // 根据 SQL 类型选择执行方法 (RSE §2.2 全指令支持)
    const sqlUpper = sql.trim().toUpperCase();
    
    if (sqlUpper.startsWith('SELECT') || sqlUpper.startsWith('PRAGMA') || sqlUpper.startsWith('WITH')) {
      // 查询类操作
      result = await db.all(sql, params || []);
    } else {
      // 修改类操作 (INSERT/UPDATE/DELETE/CREATE/DROP/...)
      // 实际上 db.run 对本地驱动会返回 { lastID, changes }
      // 对 RSE 客户端需要适配
      const runResult = await db.run(sql, params || []);
      result = {
        lastID: runResult.lastID,
        changes: runResult.changes
      };
    }

    // 符合 RSE §2.3 规范的成功响应
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error(`[RSE Bridge Error] SQL: ${req.body.sql}`, error);
    
    // 符合 RSE §2.3 规范的失败响应
    res.json({
      success: false,
      error: error.message || 'Database execution failed'
    });
  }
}

module.exports = { execute };
