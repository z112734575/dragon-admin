const Router = require('koa-router');
const userController = require('../../controllers/userController');

const router = new Router();

router.get('/users', userController.getUsers);
router.get('/users/:id', userController.getUserById);
router.put('/users/:id', userController.updateUser);
router.delete('/users/:id', userController.deleteUser);
router.post('/users/:id/roles', userController.assignRole);

module.exports = router; 