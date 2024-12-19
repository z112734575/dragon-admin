const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const router = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const jwtMiddleware = require('./middlewares/jwtMiddleware');
const logger = require('./utils/logger');

const app = new Koa();

// 中间件：解析请求体
app.use(bodyParser());

// 中间件：CORS 配置
app.use(cors({
  origin: '*', // 允许所有来源，生产环境中应限制为特定域名
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

// 错误处理中间件
app.use(errorHandler);

// JWT 中间件
app.use(jwtMiddleware);

// 路由
app.use(router.routes()).use(router.allowedMethods());

app.listen(3000, () => {
  logger.info('Server is running on http://localhost:3000');
}); 