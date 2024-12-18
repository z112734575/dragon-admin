const prismaClient = require('../models/prismaClient');

exports.getRoles = async (ctx) => {
  const roles = await prismaClient.role.findMany();
  ctx.body = { roles };
};

exports.createRole = async (ctx) => {
  const { name } = ctx.request.body;

  const role = await prismaClient.role.create({ data: { name } });

  ctx.body = { message: '角色创建成功', role };
}; 