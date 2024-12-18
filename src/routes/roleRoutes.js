const Router = require('koa-router');
const roleController = require('../controllers/roleController');

const router = new Router();

router.get('/roles', roleController.getRoles);
router.post('/roles', roleController.createRole);

module.exports = router; 