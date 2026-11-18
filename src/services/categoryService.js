/**
 * Regras de negócio de categorias.
 */
const { Category } = require('../models');
const HttpError = require('../utils/HttpError');
const {
  isNonEmptyString,
  parsePagination,
  parseFields,
  parseBooleanQuery,
} = require('../utils/validators');

const PUBLIC_FIELDS = ['id', 'name', 'slug', 'use_in_menu'];

async function search(query = {}) {
  const { limit, page, sql } = parsePagination(query);
  const fields = parseFields(query.fields, PUBLIC_FIELDS);
  const useInMenu = parseBooleanQuery(query.use_in_menu, 'use_in_menu');

  const where = {};
  if (useInMenu !== undefined) where.use_in_menu = useInMenu;

  const { rows, count } = await Category.findAndCountAll({
    where,
    attributes: fields || PUBLIC_FIELDS,
    order: [['id', 'ASC']],
    ...sql,
  });

  return { data: rows.map((r) => r.toJSON()), total: count, limit, page };
}

async function findById(id) {
  const category = await Category.findByPk(id, { attributes: PUBLIC_FIELDS });
  if (!category) throw HttpError.notFound('Categoria não encontrada');
  return category.toJSON();
}

function validate(data) {
  const errors = [];
  if (!isNonEmptyString(data.name)) errors.push('name é obrigatório');
  if (!isNonEmptyString(data.slug)) errors.push('slug é obrigatório');
  if (data.use_in_menu !== undefined && typeof data.use_in_menu !== 'boolean') {
    errors.push('use_in_menu deve ser booleano');
  }
  if (errors.length) throw HttpError.badRequest('Dados da requisição inválidos', errors);
  return { name: data.name.trim(), slug: data.slug.trim(), use_in_menu: data.use_in_menu ?? false };
}

async function create(data = {}) {
  const category = await Category.create(validate(data));
  return findById(category.id);
}

async function update(id, data = {}) {
  const category = await Category.findByPk(id);
  if (!category) throw HttpError.notFound('Categoria não encontrada');
  await category.update(validate(data));
}

async function remove(id) {
  const deleted = await Category.destroy({ where: { id } });
  if (!deleted) throw HttpError.notFound('Categoria não encontrada');
}

module.exports = { search, findById, create, update, remove };
