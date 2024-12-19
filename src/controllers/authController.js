const prismaClient = require('../models/prismaClient');
const bcrypt = require('bcryptjs');
const jsonwebtoken = require('jsonwebtoken');
const transporter = require('../utils/mailer');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET;

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.register = async (ctx) => {
  const { username, password, email, code } = ctx.request.body;
  
  if (!username || !password || !email || !code) {
    ctx.status = 400;
    ctx.body = { message: '用户名、密码、邮箱和验证码不能为空' };
    return;
  }

  try {
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

    const user = await prismaClient.user.create({
      data: {
        username,
        password: hashedPassword,
        email,
        type: 'user',
      },
    });

    await prismaClient.verificationCode.update({
      where: { id: verificationCode.id },
      data: { used: true },
    });

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
};

exports.login = async (ctx) => {
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

  const token = jsonwebtoken.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
  ctx.body = { message: '登录成功', token };
};

exports.sendVerificationCode = async (ctx) => {
  const { email, type = 'register' } = ctx.request.body;
  
  try {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      ctx.status = 400;
      ctx.body = { message: '邮箱格式不正确' };
      return;
    }

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

    const code = generateVerificationCode();
    console.log("验证码:", code);

    await prismaClient.verificationCode.create({
      data: {
        email,
        code,
        type,
        expiredAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    await transporter.sendMail({
      from: {
        name: 'Dragon Admin',
        address: process.env.MAIL_USER
      },
      to: email,
      subject: '验证码 - Dragon Admin',
      html: `
        <div style="padding: 20px; background-color: #f5f5f5;">
          <h2 style="color: #333;">��证码</h2>
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
}; 

exports.logout = async (ctx) => {
  ctx.cookies.set('token', '', { expires: new Date(0) });
  ctx.body = { message: '登出成功' };
};
