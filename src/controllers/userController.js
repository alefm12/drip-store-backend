/**
 * Controller de usuários: traduz HTTP <-> service.
 * Erros são repassados ao errorHandler via next() (Express 5 faz isso automaticamente em funções async).
 */
const userService = require('../services/userService');
const { parseId } = require('../utils/validators');

exports.show = async (req, res) => {
  res.status(200).json(await userService.findById(parseId(req.params.id)));
};

exports.create = async (req, res) => {
  res.status(201).json(await userService.create(req.body));
};

exports.update = async (req, res) => {
  await userService.update(parseId(req.params.id), req.body);
  res.status(204).end();
};

exports.destroy = async (req, res) => {
  await userService.remove(parseId(req.params.id));
  res.status(204).end();
};

exports.token = async (req, res) => {
  res.status(200).json(await userService.generateToken(req.body));
};
