const jwt = require('koa-jwt');

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = jwt({ secret: JWT_SECRET }).unless({ path: [/^\/auth\/(register|login|send-verification-code)$/, /^\/users$/, /^\/$/] }); 