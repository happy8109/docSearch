/**
 * 数据库适配器基类 (Interface)
 * 定义了业务层所需的统一数据库操作接口。
 */
class DatabaseAdapter {
  /**
   * 初始化数据库连接
   */
  async init() {
    throw new Error('Method not implemented.');
  }

  /**
   * 执行 SQL 查询，并返回结果数组中的第一行
   * @param {string} sql 
   * @param {any[]} params 
   */
  async get(sql, params = []) {
    throw new Error('Method not implemented.');
  }

  /**
   * 执行 SQL 查询，并返回所有结果行
   * @param {string} sql 
   * @param {any[]} params 
   */
  async all(sql, params = []) {
    throw new Error('Method not implemented.');
  }

  /**
   * 执行写操作（INSERT/UPDATE/DELETE）
   * 返回包含 lastID 和 changes 的结果对象
   * @param {string} sql 
   * @param {any[]} params 
   */
  async run(sql, params = []) {
    throw new Error('Method not implemented.');
  }

  /**
   * 执行原始 SQL 语句（DDL 或 事务）
   * @param {string} sql 
   */
  async exec(sql) {
    throw new Error('Method not implemented.');
  }

  /**
   * 关闭数据库连接
   */
  async close() {
    throw new Error('Method not implemented.');
  }
}

module.exports = DatabaseAdapter;
