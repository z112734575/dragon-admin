const logger = require('../utils/logger');

module.exports = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    if (err.status === 401) {
      ctx.status = 401;
      ctx.body = { message: '认证失败，访问被拒绝' };
    } else {
      ctx.status = err.status || 500;
      ctx.body = { message: err.message || '服务器内部错误' };
    }
    logger.error(err);
  }
}; 