const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const pino = require('pino');
const jwt = require('koa-jwt');
const bcrypt = require('bcryptjs');
const prisma = require('@prisma/client');
const { PrismaClient } = prisma;
const jsonwebtoken = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = new Koa();
const router = new Router();
const logger = pino();

const prismaClient = new PrismaClient();

// JWT 密钥
const JWT_SECRET = process.env.JWT_SECRET;

// 配置邮件发送器
const transporter = nodemailer.createTransport({
  service: 'qq', // 使用内置的QQ邮箱配置
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS, // QQ邮箱的授权码
  },
  debug: true, // 开启调试
});

// 生成验证码
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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
app.use(jwt({ secret: JWT_SECRET }).unless({ path: [/^\/auth\/(register|login|send-verification-code)$/, /^\/users$/, /^\/$/] }));

// 根路由
router.get('/', async (ctx) => {
  ctx.body = { message: 'Hello, World!' };
});

// 路由：注册
router.post('/auth/register', async (ctx) => {
  const { username, password, email, code } = ctx.request.body;
  
  if (!username || !password || !email || !code) {
    ctx.status = 400;
    ctx.body = { message: '用户名、密码、邮箱和验证码不能为空' };
    return;
  }

  try {
    // 验证验证码
    const verificationCode = await prismaClient.verificationCode.findFirst({
      where: {
        email,
        code,
        type: 'register',
        used: false,
        expiredAt: {
          gt: new Date(),
        },
      },
    });

    if (!verificationCode) {
      ctx.status = 400;
      ctx.body = { message: '验证码无效或已过期' };
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await prismaClient.user.create({
      data: {
        username,
        password: hashedPassword,
        email,
        type: 'user',
      },
    });

    // 标记验证码已使用
    await prismaClient.verificationCode.update({
      where: { id: verificationCode.id },
      data: { used: true },
    });

    // 记录操作日志
    await prismaClient.operationLog.create({
      data: {
        userId: user.id,
        module: 'auth',
        action: 'register',
        description: `用户注册：${username}`,
        ip: ctx.ip,
        userAgent: ctx.headers['user-agent'],
        requestUrl: ctx.url,
        method: ctx.method,
        params: JSON.stringify({ username, email }),
        status: 1,
      },
    });

    ctx.status = 201;
    ctx.body = { message: '注册成功', user };
  } catch (error) {
    logger.error('注册失败:', error);
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

// 路由：更新用��信息
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

// 路由：分配角色给
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

// 发送验证码接口
router.post('/auth/send-verification-code', async (ctx) => {
  const { email, type = 'register' } = ctx.request.body;
  
  try {
    // 验证邮箱格式
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      ctx.status = 400;
      ctx.body = { message: '邮箱格式不正确' };
      return;
    }

    // 如果是注册，检查邮箱是否已被使用
    if (type === 'register') {
      const existingUser = await prismaClient.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        ctx.status = 400;
        ctx.body = { message: '该邮箱已被注册' };
        return;
      }
    }

    // 生成验证码
    const code = generateVerificationCode();
    console.log("验证码:", code); // 开发环境下打印验证码

    // 保存验证码
    await prismaClient.verificationCode.create({
      data: {
        email,
        code,
        type,
        expiredAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    // 发送邮件
    await transporter.sendMail({
      from: {
        name: 'Dragon Admin',
        address: process.env.MAIL_USER
      },
      to: email,
      subject: '验证码 - Dragon Admin',
      html: `
        <div style="padding: 20px; background-color: #f5f5f5;">
          <h2 style="color: #333;">验证码</h2>
          <p style="font-size: 16px;">您的验证码是：<strong style="color: #1890ff; font-size: 20px;">${code}</strong></p>
          <p style="color: #666;">验证码将在15分钟后过期。</p>
          <p style="color: #999; font-size: 14px;">如果这不是您的操作，请忽略此邮件。</p>
        </div>
      `,
    });

    ctx.body = { message: '验证码已发送' };
  } catch (error) {
    console.error('发送验证码失败:', error);
    ctx.status = 500;
    ctx.body = { 
      message: '发送验证码失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
  }
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(3000, () => {
  logger.info('Server is running on http://localhost:3000');
});
