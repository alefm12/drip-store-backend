/**
 * Rotas da API v1.
 * GET são públicos; POST/PUT/DELETE exigem JWT (exceto cadastro de usuário e geração de token).
 */
const { Router } = require('express');
const auth = require('../middleware/auth');
const user = require('../controllers/userController');
const category = require('../controllers/categoryController');
const product = require('../controllers/productController');

const router = Router();

// Usuários
router.post('/user/token', user.token); // login -> JWT
router.post('/user', user.create); // cadastro público
router.get('/user/:id', user.show);
router.put('/user/:id', auth, user.update);
router.delete('/user/:id', auth, user.destroy);

// Categorias ("/search" precisa vir antes de "/:id")
router.get('/category/search', category.search);
router.get('/category/:id', category.show);
router.post('/category', auth, category.create);
router.put('/category/:id', auth, category.update);
router.delete('/category/:id', auth, category.destroy);

// Produtos
router.get('/product/search', product.search);
router.get('/product/:id', product.show);
router.post('/product', auth, product.create);
router.put('/product/:id', auth, product.update);
router.delete('/product/:id', auth, product.destroy);

module.exports = router;
