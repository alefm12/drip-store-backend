/**
 * Regras de negócio de usuários e geração de token JWT.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const HttpError = require('../utils/HttpError');
const { isNonEmptyString, isEmail } = require('../utils/validators');

const SALT_ROUNDS = 10;

/** Formato público do usuário (nunca expõe a senha). */
const toPublic = (user) => ({
  id: user.id,
  firstname: user.firstname,
  surname: user.surname,
  email: user.email,
});

async function findById(id) {
  const user = await User.findByPk(id);
  if (!user) throw HttpError.notFound('Usuário não encontrado');
  return toPublic(user);
}

/** Valida os campos básicos do usuário; retorna lista de erros. */
function validateProfile(data) {
  const errors = [];
  if (!isNonEmptyString(data.firstname)) errors.push('firstname é obrigatório');
  if (!isNonEmptyString(data.surname)) errors.push('surname é obrigatório');
  if (!isEmail(data.email)) errors.push('email inválido');
  return errors;
}

async function ensureEmailIsFree(email, ignoreId) {
  const existing = await User.findOne({ where: { email } });
  if (existing && existing.id !== ignoreId) {
    throw HttpError.badRequest('Já existe um usuário cadastrado com este email');
  }
}

async function create(data = {}) {
  const errors = validateProfile(data);
  if (!isNonEmptyString(data.password) || data.password.length < 6) {
    errors.push('password deve ter pelo menos 6 caracteres');
  }
  if (data.password !== data.confirmPassword) errors.push('password e confirmPassword não conferem');
  if (errors.length) throw HttpError.badRequest('Dados da requisição inválidos', errors);

  await ensureEmailIsFree(data.email);

  const user = await User.create({
    firstname: data.firstname.trim(),
    surname: data.surname.trim(),
    email: data.email.trim().toLowerCase(),
    password: await bcrypt.hash(data.password, SALT_ROUNDS),
  });
  return toPublic(user);
}

async function update(id, data = {}) {
  const user = await User.findByPk(id);
  if (!user) throw HttpError.notFound('Usuário não encontrado');

  const errors = validateProfile(data);
  if (errors.length) throw HttpError.badRequest('Dados da requisição inválidos', errors);

  const email = data.email.trim().toLowerCase();
  await ensureEmailIsFree(email, user.id);

  await user.update({ firstname: data.firstname.trim(), surname: data.surname.trim(), email });
}

async function remove(id) {
  const deleted = await User.destroy({ where: { id } });
  if (!deleted) throw HttpError.notFound('Usuário não encontrado');
}

/** Valida email/senha e devolve um JWT. */
async function generateToken({ email, password } = {}) {
  if (!isEmail(email) || !isNonEmptyString(password)) {
    throw HttpError.badRequest('email e password são obrigatórios');
  }

  const user = await User.scope('withPassword').findOne({
    where: { email: email.trim().toLowerCase() },
  });
  const valid = user && (await bcrypt.compare(password, user.password));
  if (!valid) throw HttpError.badRequest('Email ou senha incorretos');

  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
  return { token };
}

module.exports = { findById, create, update, remove, generateToken };
