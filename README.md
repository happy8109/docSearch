# 局域网文档搜索引擎 (Doc Search Engine)

本项目是一个轻量级、高性能的局域网内文档搜索工具。它支持对局域网内目录中储存的批量 `.doc` 和 `.docx` 报告文件进行自动文本解析、中文分词索引，并提供一个类似 Google 搜索风格的前端界面供用户进行高速检索与无格式内容在线预览。

## 当前版本
**v1.0.2** (指定 Node.js 运行环境: `v18.16.1`)

## 系统架构与开发规范文档
系统的总体设计思路、核心技术栈、数据库表结构以及对外提供的 RESTful API 接口规范，详细记录于系统开发文档中：
- **开发文档路径:** `docs/technical_framework.md` 
*(请在进行任何架构调整、API修改或模块解耦重构前，务必优先参阅并更新此文档)*

## 后续开发指引 (For Assistant Developer)
当你（AI 助手或后续开发者）接手此项目的继续开发时，请遵循以下核心原则：

1. **统一配置管理**: 所有系统级的魔术变量和环境配置，必须且只能写入 `config/app.config.json`，并在代码中通过 `config/index.js` 统一加载。
2. **极简前端约定**: 前端页面基于纯净的 HTML / CSS / Vanilla JS 构建在 `public` 目录下。**如无用户明确指令，严禁**随意引入 Webpack、Vite、Vue、React 或 TailwindCSS 等重型前端工程化工具流。
3. **保持模块解耦**: 增加新业务逻辑时，严格遵守 `routes/` (路由层) -> `controllers/` (请求处理与参数校验层) -> `services/` (核心业务与 FTS5 计算) -> `models/` (底层 SQLite 操作) 的分层结构。
4. **数据库设计不变原则**:  `documents` 与 `documents_fts` 结构采用了预先调用 `nodejieba` 分词后再存入 SQLite FTS5 的高性能策略。若需要调整检索算法，需谨慎测试中文高亮 `snippet` 的截取位置是否受影响。
5. **增量文件同步**: 系统的热同步依赖于 `chokidar`。如果后期需要增加其他文件格式 (如 `.pdf`, `.xls`) 的解析，请编写独立的解析器放入 `src/parser/` 中并在 `src/parser/index.js` 暴露。

## 快速安装与运行

```bash
# 1. 安装核心依赖
npm install

# 2. 根据需要修改 JSON 配置文件
# 位置: config/app.config.json
# 修改端口或被扫描的存放文档的根目录...

# 3. 启动后台解析进程与搜索服务
npm run app
```

访问 `http://localhost:3004` (默认配置) 即可使用系统。
