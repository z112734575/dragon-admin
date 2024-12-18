const Router = require('koa-router');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const roleRoutes = require('./roleRoutes');

const router = new Router();

router.use(authRoutes.routes());
router.use(userRoutes.routes());
router.use(roleRoutes.routes());

module.exports = router; 