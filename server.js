const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const pino = require('pino');
const jwt = require('koa-jwt');
const bcrypt = require('bcryptjs');
const prisma = require('@prisma/client');
const { PrismaClient } = prisma;
const jsonwebtoken = require('jsonwebtoken');

const app = new Koa();
const router = new Router();
const logger = pino();

const prismaClient = new PrismaClient();

// JWT 密钥
const JWT_SECRET = process.env.JWT_SECRET;

// 中间件：解析请求体
app.use(bodyParser());

// 错误处理中间件
app.use(async (ctx, next) => {
  try {
    await next(); // 执行下一个中间件
  } catch (err) {
    if (err.status === 401) {
      // 捕获 JWT 验证失败的错误
      ctx.status = 401;
      ctx.body = { message: '认证失败，访问被拒绝' };
    } else {
      // 处理其他错误
      ctx.status = err.status || 500;
      ctx.body = { message: err.message || '服务器内部错误' };
    }
    // 记录错误日志
    logger.error(err);
  }
});

// 登录保护
app.use(jwt({ secret: JWT_SECRET }).unless({ path: [/^\/auth\/(register|login)$/, /^\/$/] }));

// 根路由
router.get('/', async (ctx) => {
  ctx.body = { message: 'Hello, World!' };
});

// 路由：注册
router.post('/auth/register', async (ctx) => {
  const { username, password, email } = ctx.request.body;
  logger.info("进入注册");
  if (!username || !password || !email) {
    ctx.status = 400;
    ctx.body = { message: '用户名、密码和邮箱不能为空' };
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await prismaClient.user.create({
      data: {
        username,
        password: hashedPassword,
        email,
      },
    });
    ctx.status = 201;
    ctx.body = { message: '注册成功', user };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { message: '注册失败', error };
  }
});

// 路由：登录
router.post('/auth/login', async (ctx) => {
  const { username, password } = ctx.request.body;
  logger.info("进入登录");
  if (!username || !password) {
    ctx.status = 400;
    ctx.body = { message: '用户名和密码不能为空' };
    return;
  }

  const user = await prismaClient.user.findUnique({ where: { username } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    ctx.status = 401;
    ctx.body = { message: '用户名或密码错误' };
    return;
  }

  // 生成 JWT
  const token = jsonwebtoken.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
  ctx.body = { message: '登录成功', token };
});

// 路由：获取用户列表
router.get('/users', async (ctx) => {
  const users = await prismaClient.user.findMany();
  ctx.body = { users };
});

// 路由：获取用户详情
router.get('/users/:id', async (ctx) => {
  const { id } = ctx.params;
  const user = await prismaClient.user.findUnique({ where: { id: parseInt(id) } });

  if (!user) {
    ctx.status = 404;
    ctx.body = { message: '用户未找到' };
    return;
  }

  ctx.body = { user };
});

// 路由：更新用户信息
router.put('/users/:id', async (ctx) => {
  const { id } = ctx.params;
  const { username, email } = ctx.request.body;

  const user = await prismaClient.user.update({
    where: { id: parseInt(id) },
    data: { username, email },
  });

  ctx.body = { message: '用户更新成功', user };
});

// 路由：删除用户
router.delete('/users/:id', async (ctx) => {
  const { id } = ctx.params;

  const user = await prismaClient.user.delete({ where: { id: parseInt(id) } });

  ctx.body = { message: '用户删除成功', user };
});

// 路由：获取所有角色
router.get('/roles', async (ctx) => {
  const roles = await prismaClient.role.findMany();
  ctx.body = { roles };
});

// 路由：创建角色
router.post('/roles', async (ctx) => {
  const { name } = ctx.request.body;

  const role = await prismaClient.role.create({ data: { name } });

  ctx.body = { message: '角色创建成功', role };
});

// 路由：分配角色给用户
router.post('/users/:id/roles', async (ctx) => {
  const { id } = ctx.params;
  const { roleId } = ctx.request.body;

  const user = await prismaClient.user.update({
    where: { id: parseInt(id) },
    data: {
      roles: {
        connect: { id: roleId },
      },
    },
  });

  ctx.body = { message: '角色分配成功', user };
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(3000, () => {
  logger.info('Server is running on http://localhost:3000');
});
