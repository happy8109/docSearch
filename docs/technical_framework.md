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
│   ├── app.config.json    # JSON 格式的统一配置文件
│   └── index.js           # 解析并加载配置（支持多目录、相对/绝对路径兼容）
├── src/
│   ├── app.js             # Express 应用实例与中间件注册（含 morgan 请求日志）
│   ├── server.js          # 服务启动入口
│   ├── routes/            # API 路由定义
│   ├── controllers/       # 请求处理逻辑
│   ├── services/
│   │   ├── searchService.js   # 搜索逻辑（分词 + FTS5 查询）
│   │   └── syncService.js     # 文件同步（异步队列 + chokidar 监听）
│   ├── models/
│   │   └── db.js          # SQLite 数据库初始化与访问
│   ├── utils/
│   │   ├── logger.js      # Winston 日志模块（控制台 + 文件双轨输出）
│   │   └── tokenizer.js   # @node-rs/jieba 中文分词封装
│   └── parser/
│       ├── index.js       # 解析入口（按扩展名分派）
│       ├── docExtractor.js    # .doc 解析器
│       └── docxExtractor.js   # .docx 解析器
├── public/                # 前端静态文件 (HTML/CSS/JS)
├── db/                    # SQLite 数据库文件（已加入 .gitignore）
├── logs/                  # 运行日志（按日期自动滚动，已加入 .gitignore）
├── scripts/               # 辅助脚本（如测试文档生成器）
├── docs/                  # 开发文档
└── package.json
```
- **配置中心化**: 所有关键设置（端口、数据库路径、监控目录列表等）在 `app.config.json` 中集中配置，由 `config/index.js` 统一加载。

### 3. 数据库设计 (SQLite + FTS5)
采用**"预分词"策略**解决 SQLite 不支持中文分词的问题：
1. **`documents` (元数据表)**: 保存文件的相对路径、文件名、修改时间 (`mtime`) 及原始纯文本内容（用于预览）。
2. **`documents_fts` (全文搜索虚拟表)**: FTS5 引擎表。文本入库前由 `@node-rs/jieba` 分词并用空格隔开后存入。
3. **查询机制**: 搜索时对用户关键词做同样的分词，再执行 FTS5 `MATCH` 查询，利用内置 `snippet` 函数返回高亮片段。

### 4. 数据同步与处理流程
- **多目录监控**: 配置文件 `docDirectories` 支持数组格式，可同时监视多个目录（兼容绝对路径与相对路径）。
- **文件监听引擎**: 使用 `chokidar` 监听所有配置目录，自动感知文件的新增、修改、重命名和删除。
- **异步索引队列**: 批量文件变更时通过队列串行处理，避免 SQLite 并发事务冲突。
- **mtime 校验**: 系统重启时全量扫描，但通过文件修改时间戳跳过未变更文件，避免重复解析。
- **临时文件过滤**: 自动忽略以 `.` 或 `~` 开头的文件（如 Word 临时锁文件 `~$xxx.docx`）。

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
