const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const router = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const jwtMiddleware = require('./middlewares/jwtMiddleware');
const logger = require('./utils/logger');

const app = new Koa();

// 中间件：解析请求体
app.use(bodyParser());

// 错误处理中间件
app.use(errorHandler);

// JWT 中间件
app.use(jwtMiddleware);

// 路由
app.use(router.routes()).use(router.allowedMethods());

app.listen(3000, () => {
  logger.info('Server is running on http://localhost:3000');
}); 