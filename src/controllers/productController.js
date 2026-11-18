/**
 * Controller de produtos.
 * baseUrl é usado para montar a URL pública das imagens.
 */
const productService = require('../services/productService');
const { parseId } = require('../utils/validators');

const baseUrl = (req) => process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

exports.search = async (req, res) => {
  res.status(200).json(await productService.search(req.query, baseUrl(req)));
};

exports.show = async (req, res) => {
  res.status(200).json(await productService.findById(parseId(req.params.id), baseUrl(req)));
};

exports.create = async (req, res) => {
  res.status(201).json(await productService.create(req.body, baseUrl(req)));
};

exports.update = async (req, res) => {
  await productService.update(parseId(req.params.id), req.body);
  res.status(204).end();
};

exports.destroy = async (req, res) => {
  await productService.remove(parseId(req.params.id));
  res.status(204).end();
};
