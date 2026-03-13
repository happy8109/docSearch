const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// 基础中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件托管（原生前端代码放在 ../public 目录）
app.use(express.static(path.join(__dirname, '../public')));

// 注册 API 路由
const apiRoutes = require('./routes/index');
app.use('/api', apiRoutes);

// 404 处理
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found' });
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('[App Error]', err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

module.exports = app;
