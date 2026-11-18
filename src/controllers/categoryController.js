/**
 * Controller de categorias.
 */
const categoryService = require('../services/categoryService');
const { parseId } = require('../utils/validators');

exports.search = async (req, res) => {
  res.status(200).json(await categoryService.search(req.query));
};

exports.show = async (req, res) => {
  res.status(200).json(await categoryService.findById(parseId(req.params.id)));
};

exports.create = async (req, res) => {
  res.status(201).json(await categoryService.create(req.body));
};

exports.update = async (req, res) => {
  await categoryService.update(parseId(req.params.id), req.body);
  res.status(204).end();
};

exports.destroy = async (req, res) => {
  await categoryService.remove(parseId(req.params.id));
  res.status(204).end();
};
