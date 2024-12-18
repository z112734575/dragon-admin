const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'qq',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  debug: true,
});

module.exports = transporter; 