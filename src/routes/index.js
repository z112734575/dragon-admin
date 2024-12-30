const Router = require('koa-router');
const fs = require('fs');
const path = require('path');

const router = new Router();

// 动态加载版本化路由
const versions = ['v1']; // 可以根据需要添加更多版本, 比如 ['v1', 'v2']

versions.forEach(version => {
  const versionRouter = new Router();
  versionRouter.prefix(`/${version}`);

  const routesPath = path.join(__dirname, version);
  fs.readdirSync(routesPath).forEach(file => {
    const route = require(path.join(routesPath, file));
    versionRouter.use(route.routes());
  });

  router.use(versionRouter.routes());
});

module.exports = router; 