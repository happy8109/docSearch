# 文档搜索引擎 (Doc Search Engine)

本项目是一个轻量级、高性能的文档搜索工具。支持对多个目录中储存的批量 `.doc` 和 `.docx` 文件进行自动文本解析、中文分词索引，并提供类似 Google 搜索风格的前端界面供用户进行高速检索与无格式内容在线预览。

## 当前版本
**v1.0.3** · Node.js `v18.16.1`

## 系统开发文档
- **技术方案:** `docs/technical_framework.md` — 涵盖架构设计、数据库结构、API 规范等
- 进行架构调整或 API 修改前，请优先参阅并同步更新上述文档

## 主要功能
- 🔍 **全文搜索** — 基于 SQLite FTS5 + 结巴中文分词，毫秒级返回结果
- 📄 **文档预览** — 弹窗展示纯文本内容，搜索关键词高亮显示
- ⬇️ **原文下载** — 一键下载原始 .doc/.docx 文件
- 📂 **多目录监控** — 支持同时监视多个文档目录（绝对/相对路径均可）
- 🔄 **实时同步** — 自动检测文件新增、修改、重命名、删除并更新索引
- 📋 **日志系统** — Winston 双轨日志（控制台 + 按日期滚动归档）
- 🌐 **RESTful API** — 开放标准接口，支持外部程序调用

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置监控目录（可选）
# 编辑 config/app.config.json，修改 docDirectories 数组
# 支持相对路径和绝对路径混合使用

# 3. 启动服务
npm run app
```

访问 `http://localhost:3004` 即可使用。

## 配置说明

配置文件位于 `config/app.config.json`：

```json
{
  "port": 3004,
  "dbRelativePath": "db/doc_search.db",
  "docDirectories": [
    "../data",
    "D:\\reports\\archive"
  ],
  "supportedExtensions": [".doc", ".docx"],
  "defaultPageLimit": 10
}
```

| 配置项 | 说明 |
|--------|------|
| `port` | 服务监听端口 |
| `dbRelativePath` | SQLite 数据库文件路径（相对项目根目录） |
| `docDirectories` | 被监控的文档目录列表（支持绝对/相对路径） |
| `supportedExtensions` | 支持解析的文件扩展名 |
| `defaultPageLimit` | 搜索结果默认每页条数 |

## 后续开发指引

1. **统一配置管理**: 所有配置写入 `config/app.config.json`，通过 `config/index.js` 加载。
2. **极简前端约定**: 纯 HTML / CSS / Vanilla JS，禁止引入重型框架。
3. **保持模块解耦**: 遵守 `routes/` → `controllers/` → `services/` → `models/` 分层结构。
4. **日志规范**: 使用 `src/utils/logger.js` 替代 `console.log`，支持分级输出。
5. **新增文件格式**: 在 `src/parser/` 中编写独立解析器并在入口文件注册即可。
