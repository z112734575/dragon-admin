const Router = require('koa-router');
const authController = require('../../controllers/authController');

const router = new Router();

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/send-verification-code', authController.sendVerificationCode);

module.exports = router; 