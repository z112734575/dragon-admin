const prismaClient = require('../models/prismaClient');

exports.getUsers = async (ctx) => {
  const users = await prismaClient.user.findMany();
  ctx.body = { users };
};

exports.getUserById = async (ctx) => {
  const { id } = ctx.params;
  const user = await prismaClient.user.findUnique({ where: { id: parseInt(id) } });

  if (!user) {
    ctx.status = 404;
    ctx.body = { message: '用户未找到' };
    return;
  }

  ctx.body = { user };
};

exports.updateUser = async (ctx) => {
  const { id } = ctx.params;
  const { username, email } = ctx.request.body;

  const user = await prismaClient.user.update({
    where: { id: parseInt(id) },
    data: { username, email },
  });

  ctx.body = { message: '用户更新成功', user };
};

exports.deleteUser = async (ctx) => {
  const { id } = ctx.params;

  const user = await prismaClient.user.delete({ where: { id: parseInt(id) } });

  ctx.body = { message: '用户删除成功', user };
};

exports.assignRole = async (ctx) => {
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
};