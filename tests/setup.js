/**
 * Helpers dos testes: banco SQLite em memória recriado a cada suíte
 * e criação rápida de usuário + token.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/models');

async function resetDatabase() {
  await sequelize.sync({ force: true });
}

async function createUserAndToken(email = 'tester@mail.com') {
  await request(app).post('/v1/user').send({
    firstname: 'Test',
    surname: 'User',
    email,
    password: '123456',
    confirmPassword: '123456',
  });
  const res = await request(app).post('/v1/user/token').send({ email, password: '123456' });
  return res.body.token;
}

module.exports = { app, request, sequelize, resetDatabase, createUserAndToken };
