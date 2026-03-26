# RSE 协议重构方案 (修订版)

> 本文档描述了 docSearch 项目按照《异构系统远程 SQL 执行 (RSE) 协议》（`docs/sql_bridge_spec.md`）及用户新增要求进行重构的完整技术方案。

## 1. 背景与目标

### 1.1 现状
docSearch 当前作为单机部署系统运行，所有数据库操作通过 `models/db.js` 直接调用本地 SQLite 库。

### 1.2 目标
引入 RSE 协议适配器模式，支持通过布尔配置切换**双模式部署**：
- **本地模式 (isRemoteMode: false)**：A 网运行，提供全量功能（搜索、预览、下载、索引）并暴露 RSE SQL 服务端点。
- **远程模式 (isRemoteMode: true)**：B 网运行，通过串口桥透传 SQL 查询 A 网数据。**仅支持只读操作**，禁用文件下载。

### 1.3 远程模式写操作分析
**结论：远程模式不需要写操作。**
- **数据源单一性**：数据源始终在 A 网主机。文件解析、分词、索引同步均由 A 网 `syncService` 负责。
- **只读终端**：B 网仅作为查询界面。数据库写请求（`UPDATE`/`INSERT`/`DELETE`）或 DDL/事务（`exec`）在远程驱动层应被拦截，防止逻辑错误。

---

## 2. 架构设计

### 2.1 部署模型
```
A网 (数据源端 - 本地模式)                   B网 (远程查询端 - 远程模式)
┌─────────────────────────┐              ┌──────────────────────────┐
│ docSearch                │              │ docSearch                 │
│ · isRemoteMode: false    │              │ · isRemoteMode: true      │
│ · SQLite 本地数据库      │              │ · 无本地数据库            │
│ · 文件监听服务 (写操作)  │              │ · [核心] 仅搜索/预览 (只读)│
│ · 搜索/预览/下载         │              │ · [用户] 置灰下载按钮     │
│ · RSE SQL 端点 ◄─────────┤── 串口桥 ◄──┤ · RemoteDriver ─────────►│
│   POST /api/sql          │              │   (请求 A 网)            │
└──────────┬──────────────┘              └──────────────────────────┘
        [a1主机] ════串口线════ [b1主机]
```

### 2.2 带宽优化 (针对低速率串口)
为了在串口链路上获得更好的性能，实施以下策略：
1. **强制分页同步**：远程模式下限制 `LIMIT` 不得超过 10，防止单次数据包过大。
2. **字段精简**：查询中严禁 `SELECT *`（RSE §4.1），且仅返回前端渲染所需的字段。
3. **文本截断**：A 网服务端在响应远程预览请求时，可提前截断过大文本块。
4. **轻量 Header**：HTTP 持久连接管理（禁用 Keep-Alive 减少握手负担）。

---

## 3. 详细设计

### 3.1 配置系统 (`config/app.config.json`)
```json
{
  "isRemoteMode": false,
  "remoteDbUrl": "http://b1:port/api/proxy/sql"
}
```

### 3.2 数据库适配器工厂 (`db.js`)
- 若 `isRemoteMode` 为 `true`，实例化 `RemoteDriver`。
- `RemoteDriver` 仅实现 `get` 和 `all` 方法的 HTTP 透传。调用 `run` 或 `exec` 时将静默返回或抛出错误。

### 3.3 启动流程设计 (`server.js`)
```javascript
if (!config.isRemoteMode) {
  await db.init(); // 仅本地模式初始化库和表
  syncService.start(); // 仅本地模式启动监听
}
```

### 3.4 前端界面适配 (`app.js`)
- **模式标识**：读取 `api/system/status` 的 `isRemoteMode` 及 `version` 并在页脚显示：`[远程模式] v1.2.0 | ...`。
- **置灰方案**：
  - 远程模式下，下载按钮添加 `disabled` 属性并移除 `href`。
  - 样式上使用灰色半透明显示，光标为 `not-allowed`。
  - 用户一眼即可识别当前处于受限的远程查询模式。

---

## 4. 变更文件清单

| 文件 | 操作 | 说明 |
| :--- | :--- | :--- |
| `src/models/database.adapter.js` | 新增 | 数据库访问抽象接口 |
| `src/models/drivers/local.driver.js` | 新增 | 本地 SQLite 读写驱动 |
| `src/models/drivers/remote.driver.js` | 新增 | **只读** RSE HTTP 驱动 |
| `src/controllers/sqlBridgeController.js` | 新增 | SQL 指令执行端点 (A网) |
| `src/models/db.js` | 修改 | 重构为根据配置切换的工厂模式 |
| `src/server.js` | 修改 | 根据模式分叉启动逻辑 |
| `src/controllers/systemController.js` | 修改 | 返回 `isRemoteMode` 字段 |
| `public/js/app.js` | 修改 | 处理置灰下载按钮、模式标识显示 |
| `config/app.config.json` | 修改 | 配置项调整 (Boolean + String) |
| `docs/technical_framework.md` | 修改 | 更新文档总体架构图 |
| `README.md` | 修改 | 索引版本号升级 |

---

## 5. 验证计划

1. **配置验证**：手动将 `isRemoteMode` 设为 `true`，重启程序，确认 `logs` 中未出现 SQLite 连接成功日志。
2. **UI 验证**：
   - 确认搜索页脚显示 `[远程模式]`。
   - 确认点击预览中的“下载”按钮无效且视觉上为置灰状态。
3. **接口验证**：A 网 `POST /api/sql` 是否能正确返回 JSON (RSE §2.3)。
