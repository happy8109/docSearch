# 文档搜索引擎 (Doc Search Engine)

本项目是一个轻量级、高性能的文档搜索工具。支持对多个目录中存储的 `.doc` 和 `.docx` 文件进行自动文本解析、分词索引，并提供 Google 风格的前端检索界面。

本版本已按照 **《远程 SQL 执行 (RSE) 协议》** 完成重构，支持在跨网闸/串口链路环境下的“双模式”部署。

## 当前版本
**v1.2.0 (RSE Edition)** · Node.js `v18.16.1`

## 系统开发文档
- **技术方案:** `docs/technical_framework.md` — 基础架构设计
- **RSE 协议规范:** `docs/sql_bridge_spec.md` — 异构系统通信标准
- **RSE 重构方案:** `docs/rse_refactor_plan.md` — 部署重构详细设计

## 核心功能
- 🔍 **双模式部署** — 支持本地模式 (A网) 与远程模式 (B网)。
- 🛡️ **安全只读** — 远程驱动层强制拦截所有写操作，确保 A 网数据安全。
- ⚡ **带宽优化** — 针对低速率串口链路优化，禁止 `SELECT *` 并强制分页。
- 📄 **文档预览** — 弹窗展示分词高亮内容（远程模式自动禁用原文下载以保护带宽）。
- 🔄 **实时感知** — 前端自动轮询链接状态，支持断网拦截与自动重连提示。

## 快速开始

### 方式 A：标准本地运行 (A网)
```bash
npm install
npm run app # 默认端口 3004
```

### 方式 B：RSE 模式联调 (A/B 网模拟)
1. **启动 A 网实例 (数据源)**:  
   `node src/server.js --port=3004`
2. **启动 B 网实例 (查询端)**:  
   编辑 `config/app.config.json` 设置 `remoteDbUrl: "http://localhost:3004/api/sql"`，然后运行：  
   `node src/server.js --port=3005 --remote`

## 命令行参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `--port=N` | 覆盖配置文件中的监听端口 | `--port=8080` |
| `--remote` | 开启远程模式（跳过本地 IO 监控，仅转发 SQL） | `--remote` |

## 配置说明 (`config/app.config.json`)

| 配置项 | 类型 | 说明 |
|--------|------|------|
| `port` | Number | 默认监听端口 |
| `docDirectories` | Array | [本地模式] 监控的文档目录列表 |
| `isRemoteMode` | Boolean | 是否默认为远程模式 |
| `remoteDbUrl` | String | [远程模式] A 网 SQL Bridge 访问地址 |
| `statusPollInterval` | Number | 前端系统状态轮询间隔 (秒) |

## 后续开发指引
1. **统一配置**: 所有运行参数优先通过 `config/app.config.json` 管理。
2. **极简前端**: 遵循 Vanilla JS + 原生 CSS，禁止引入外部重型 UI 库。
3. **驱动解耦**: 数据库操作必须通过 `src/models/db.js` 工厂获取适配器。
4. **协议一致性**: 任何 API 变动需符合 `docs/sql_bridge_spec.md` 中的 JSON 响应格式。
