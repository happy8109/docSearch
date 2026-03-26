# 文档搜索引擎总体技术方案

该方案旨在构建一个轻量级、高性能的文档搜索引擎，支持对 `.doc` 和 `.docx` 文件的文本提取和全文检索。前端界面参考 Google 搜索引擎的设计，提供简洁易用的搜索体验。

## 架构概览

由于总容量较小（约6000个文件，200MB），不需要引入 Elasticsearch 等重型组件。系统采用前后端分离架构，均在一个轻量级 Node.js 进程中运行。

### 1. 核心技术栈
- **运行环境**: Node.js v18.16.1
- **后端服务**: Express（轻量 API 和静态文件服务）
- **数据库引擎**: SQLite3 + FTS5 扩展（极速文本全文检索）
- **中文分词方案**: `@node-rs/jieba`（基于 Rust 预编译的结巴分词，无需 C++ 编译环境）
- **文档解析库**: 
  - `.docx`：`textract`
  - `.doc`：`word-extractor`（纯 Node.js 实现）
- **日志系统**: `winston` + `winston-daily-rotate-file`（按日期自动滚动、分级归档）+ `morgan`（HTTP 请求日志）
- **文件监听**: `chokidar`（实时感知文件变更）
- **前端页面**: 纯原生 HTML / CSS / Vanilla JS（CSS 模仿 Google 风格）

### 2. 项目目录结构与模块解耦
```
doc-search-engine/
├── config/
│   ├── app.config.json    # 配置切换: isRemoteMode, remoteDbUrl
│   └── index.js           # 增加命令行 --port 覆盖支持
├── src/
│   ├── server.js          # 分模式启动逻辑
│   ├── models/
│   │   ├── db.js          # 适配器工厂
│   │   ├── database.adapter.js # 抽象接口
│   │   └── drivers/       # 本地(SQLite)与远程(RSE HTTP)驱动实现
│   ├── controllers/
│   │   └── sqlBridgeController.js # RSE SQL 端点 (A网)
```

### 3. 数据库设计 (适配器模式)
系统引入了数据库抽象层以支持异构部署：
1. **适配器接口**: 统一定义了 `get/all/run/exec` 指令。
2. **本地模式 (A网)**: 使用 `LocalDriver` 直接操作 SQLite 库，负责全量索引与写操作。
3. **远程模式 (B网)**: 使用 `RemoteDriver`。所有查询指令通过串口桥（HTTP 透传）发送至 A 网执行，并拦截所有写操作以保证源安全性。

### 4. 数据同步与处理流程
- **分模式启动**: 只有在 `isRemoteMode: false` 时，系统才会加载 `syncService` 和初始化本地数据库文件，从而节省 B 网端的系统资源。
- **带宽优化**: 远程模式强制分页且严禁 `SELECT *`，最大化适配低速率物理链路。

### 7. 核心接口规范 (RESTful API)

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/search` | GET | 全文检索 |
| `/api/sql` | POST | **[新增]** RSE 远程 SQL 执行接口 (仅 A网可用) |
| `/api/document/:id/download` | GET | 下载原始文件 (B网自动置灰禁用) |

### 5. 日志系统
- **控制台输出**: 带颜色分级的实时日志（开发环境）。
- **文件归档**: 
  - `logs/application-YYYY-MM-DD.log`：常规运行日志 + HTTP 请求记录（保留 14 天）。
  - `logs/error-YYYY-MM-DD.log`：错误日志含完整堆栈（保留 30 天）。
- **HTTP 请求日志**: 通过 `morgan` 中间件自动记录所有 API 访问。

### 6. 前端界面设计
- **首页**: 极简留白风格，中央 Logo + 搜索框 + 清除按钮 + 搜索按钮。
- **搜索结果页**: 顶部搜索栏 + 结果列表（标题、路径、高亮摘要）+ 分页。
- **预览浮窗**: 点击标题弹出浮窗，展示纯文本完整内容，**搜索关键词高亮显示**，底部提供原文件下载按钮。
- **系统状态栏**: 页面底部显示系统版本号、索引文档数、运行时间等信息。

### 7. 核心接口规范 (RESTful API)

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/search` | GET | 全文检索，参数: `q`, `page`, `limit`，返回带高亮 snippet 的分页结果 |
| `/api/document/:id/text` | GET | 获取指定文档的纯文本内容（供预览使用） |
| `/api/document/:id/download` | GET | 下载原始 .doc/.docx 文件 |
| `/api/system/status` | GET | 返回系统版本、索引数、监控目录、运行时间等状态 |

### 8. 开发原则
1. **统一配置与解耦结构**: 严格按照 Controller → Service → Model 三层架构开发。
2. **极简前端架构**: 纯原生 HTML / CSS / Vanilla JS，通过 Fetch API 与后端交互。
3. **新增文件格式支持**: 编写独立解析器放入 `src/parser/` 并在入口文件中注册。
