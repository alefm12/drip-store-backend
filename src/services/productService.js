/**
 * Regras de negócio de produtos: busca com filtros, CRUD completo,
 * imagens (base64 -> disco), opções e categorias.
 */
const { Op } = require('sequelize');
const {
  sequelize,
  Product,
  ProductImage,
  ProductOption,
  Category,
  ProductCategory,
} = require('../models');
const HttpError = require('../utils/HttpError');
const storage = require('./imageStorage');
const {
  isNonEmptyString,
  isNumber,
  parsePagination,
  parseFields,
} = require('../utils/validators');

const SCALAR_FIELDS = [
  'id',
  'enabled',
  'name',
  'slug',
  'stock',
  'description',
  'price',
  'price_with_discount',
];
const PUBLIC_FIELDS = [...SCALAR_FIELDS, 'category_ids', 'images', 'options'];

const INCLUDES = [
  { model: ProductImage, as: 'images', attributes: ['id', 'path'] },
  { model: ProductOption, as: 'options' },
  { model: Category, as: 'categories', attributes: ['id'], through: { attributes: [] } },
];

/* ------------------------------------------------------------------ */
/* Serialização                                                         */
/* ------------------------------------------------------------------ */

function serializeOption(option) {
  return {
    id: option.id,
    title: option.title,
    shape: option.shape,
    radius: option.radius,
    type: option.type,
    values: option.values ? option.values.split(',') : [],
  };
}

/** Converte o model no formato de resposta da documentação. */
function serialize(product, baseUrl, fields) {
  const full = {
    id: product.id,
    enabled: Boolean(product.enabled),
    name: product.name,
    slug: product.slug,
    stock: product.stock,
    description: product.description,
    price: product.price,
    price_with_discount: product.price_with_discount,
    category_ids: (product.categories || []).map((c) => c.id).sort((a, b) => a - b),
    images: (product.images || [])
      .sort((a, b) => a.id - b.id)
      .map((img) => ({ id: img.id, content: storage.toUrl(baseUrl, img.path) })),
    options: (product.options || []).sort((a, b) => a.id - b.id).map(serializeOption),
  };
  if (!fields) return full;
  return Object.fromEntries(fields.map((f) => [f, full[f]]));
}

/* ------------------------------------------------------------------ */
/* Busca                                                                */
/* ------------------------------------------------------------------ */

/** Lê os filtros option[ID]=A,B (suporta query parser "extended" e "simple"). */
function readOptionFilters(query) {
  const filters = {};
  if (query.option && typeof query.option === 'object') {
    Object.assign(filters, query.option);
  }
  Object.keys(query).forEach((key) => {
    const m = /^option\[(\d+)\]$/.exec(key);
    if (m) filters[m[1]] = query[key];
  });

  return Object.entries(filters).map(([id, values]) => {
    const optionId = Number(id);
    if (!Number.isInteger(optionId)) throw HttpError.badRequest('Filtro option inválido');
    const list = String(values)
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    return { optionId, values: list };
  });
}

/** Retorna ids de produtos que satisfazem TODOS os filtros de opção. */
async function productIdsMatchingOptions(optionFilters) {
  let result = null;
  for (const { optionId, values } of optionFilters) {
    const option = await ProductOption.findByPk(optionId);
    const optionValues = option ? option.values.split(',') : [];
    const matches = option && values.some((v) => optionValues.includes(v));
    const ids = new Set(matches ? [option.product_id] : []);
    result = result === null ? ids : new Set([...result].filter((x) => ids.has(x)));
  }
  return result ? [...result] : null;
}

async function buildWhere(query) {
  const where = {};
  const idConstraints = []; // listas de ids permitidos (interseção)

  if (isNonEmptyString(query.match)) {
    const term = `%${query.match.trim()}%`;
    where[Op.or] = [{ name: { [Op.like]: term } }, { description: { [Op.like]: term } }];
  }

  if (query.category_ids !== undefined) {
    const ids = String(query.category_ids)
      .split(',')
      .map((v) => Number(v.trim()));
    if (!ids.length || ids.some((id) => !Number.isInteger(id))) {
      throw HttpError.badRequest('category_ids deve ser uma lista de inteiros separados por vírgula');
    }
    const links = await ProductCategory.findAll({
      where: { category_id: { [Op.in]: ids } },
      attributes: ['product_id'],
    });
    idConstraints.push(links.map((l) => l.product_id));
  }

  if (query['price-range'] !== undefined) {
    const m = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/.exec(String(query['price-range']));
    if (!m || Number(m[1]) > Number(m[2])) {
      throw HttpError.badRequest('price-range deve seguir o formato min-max, ex.: 100-200');
    }
    where.price = { [Op.between]: [Number(m[1]), Number(m[2])] };
  }

  const optionIds = await productIdsMatchingOptions(readOptionFilters(query));
  if (optionIds) idConstraints.push(optionIds);

  if (idConstraints.length) {
    const allowed = idConstraints.reduce((acc, list) => acc.filter((id) => list.includes(id)));
    where.id = { [Op.in]: allowed };
  }

  return where;
}

async function search(query = {}, baseUrl = '') {
  const { limit, page, sql } = parsePagination(query);
  const fields = parseFields(query.fields, PUBLIC_FIELDS);
  const where = await buildWhere(query);

  const { rows, count } = await Product.findAndCountAll({
    where,
    include: INCLUDES,
    distinct: true,
    order: [['id', 'ASC']],
    ...sql,
  });

  return { data: rows.map((p) => serialize(p, baseUrl, fields)), total: count, limit, page };
}

async function findById(id, baseUrl = '') {
  const product = await Product.findByPk(id, { include: INCLUDES });
  if (!product) throw HttpError.notFound('Produto não encontrado');
  return serialize(product, baseUrl);
}

/* ------------------------------------------------------------------ */
/* Validação                                                            */
/* ------------------------------------------------------------------ */

/**
 * Valida os campos escalares. Em criação (partial=false) os campos
 * obrigatórios precisam existir; em atualização valida só os enviados.
 */
function validateScalars(data, partial) {
  const errors = [];
  const has = (k) => data[k] !== undefined;
  const required = (k) => !partial || has(k);

  if (required('name') && !isNonEmptyString(data.name)) errors.push('name é obrigatório');
  if (required('slug') && !isNonEmptyString(data.slug)) errors.push('slug é obrigatório');
  if (required('price') && !(isNumber(data.price) && data.price >= 0)) {
    errors.push('price deve ser um número maior ou igual a zero');
  }
  if (required('price_with_discount') && !(isNumber(data.price_with_discount) && data.price_with_discount >= 0)) {
    errors.push('price_with_discount deve ser um número maior ou igual a zero');
  }
  if (has('enabled') && typeof data.enabled !== 'boolean') errors.push('enabled deve ser booleano');
  if (has('stock') && !(Number.isInteger(data.stock) && data.stock >= 0)) {
    errors.push('stock deve ser um inteiro maior ou igual a zero');
  }
  if (has('description') && data.description !== null && typeof data.description !== 'string') {
    errors.push('description deve ser texto');
  }
  if (has('category_ids') && !(Array.isArray(data.category_ids) && data.category_ids.every(Number.isInteger))) {
    errors.push('category_ids deve ser uma lista de inteiros');
  }
  if (has('images') && !Array.isArray(data.images)) errors.push('images deve ser uma lista');
  if (has('options') && !Array.isArray(data.options)) errors.push('options deve ser uma lista');

  if (errors.length) throw HttpError.badRequest('Dados da requisição inválidos', errors);

  const scalars = {};
  ['enabled', 'name', 'slug', 'stock', 'description', 'price', 'price_with_discount'].forEach((k) => {
    if (has(k)) scalars[k] = typeof data[k] === 'string' ? data[k].trim() : data[k];
  });
  return scalars;
}

/** Normaliza uma opção: aceita "values" ou "value", lista ou string; radius "4px" -> 4. */
function normalizeOption(raw, partial) {
  const out = {};
  const errors = [];

  if (raw.title !== undefined || !partial) {
    if (!isNonEmptyString(raw.title)) errors.push('title da opção é obrigatório');
    else out.title = raw.title.trim();
  }
  if (raw.shape !== undefined) {
    if (!['square', 'circle'].includes(raw.shape)) errors.push('shape deve ser square ou circle');
    else out.shape = raw.shape;
  }
  if (raw.type !== undefined) {
    if (!['text', 'color'].includes(raw.type)) errors.push('type deve ser text ou color');
    else out.type = raw.type;
  }
  if (raw.radius !== undefined) {
    const radius = parseInt(raw.radius, 10);
    if (Number.isNaN(radius) || radius < 0) errors.push('radius inválido');
    else out.radius = radius;
  }

  const rawValues = raw.values ?? raw.value;
  if (rawValues !== undefined || !partial) {
    const list = Array.isArray(rawValues)
      ? rawValues
      : typeof rawValues === 'string'
        ? rawValues.split(',')
        : [];
    const values = list.map((v) => String(v).trim()).filter(Boolean);
    if (!values.length) errors.push('values da opção é obrigatório');
    else out.values = values.join(',');
  }

  if (errors.length) throw HttpError.badRequest('Opção de produto inválida', errors);
  return out;
}

async function ensureCategoriesExist(ids, transaction) {
  const unique = [...new Set(ids)];
  const count = await Category.count({ where: { id: { [Op.in]: unique } }, transaction });
  if (count !== unique.length) throw HttpError.badRequest('Uma ou mais categorias não existem');
  return unique;
}

/* ------------------------------------------------------------------ */
/* Escrita                                                              */
/* ------------------------------------------------------------------ */

/** Grava imagens novas (base64 ou URL) e devolve o caminho a salvar. */
async function storeImage(productId, image) {
  if (!image || !isNonEmptyString(image.content)) {
    throw HttpError.badRequest('Cada imagem deve ter o campo content');
  }
  if (storage.isUrl(image.content)) return image.content;
  return storage.saveBase64(productId, image.type, image.content);
}

async function syncImages(product, images, transaction, filesToRemove) {
  for (const image of images) {
    if (image.id === undefined) {
      const path = await storeImage(product.id, image);
      await ProductImage.create({ product_id: product.id, path, enabled: true }, { transaction });
      continue;
    }

    const existing = await ProductImage.findOne({
      where: { id: image.id, product_id: product.id },
      transaction,
    });
    if (!existing) throw HttpError.badRequest(`Imagem ${image.id} não pertence ao produto`);

    if (image.deleted) {
      filesToRemove.push(existing.path);
      await existing.destroy({ transaction });
    } else if (isNonEmptyString(image.content) && !storage.isUrl(image.content)) {
      // novo conteúdo em base64 substitui o arquivo atual
      filesToRemove.push(existing.path);
      const path = await storage.saveBase64(product.id, image.type || 'image/png', image.content);
      await existing.update({ path }, { transaction });
    }
    // content com URL = imagem mantida como está
  }
}

async function syncOptions(product, options, transaction) {
  for (const raw of options) {
    if (raw.id === undefined) {
      await ProductOption.create(
        { ...normalizeOption(raw, false), product_id: product.id },
        { transaction }
      );
      continue;
    }

    const existing = await ProductOption.findOne({
      where: { id: raw.id, product_id: product.id },
      transaction,
    });
    if (!existing) throw HttpError.badRequest(`Opção ${raw.id} não pertence ao produto`);

    if (raw.deleted) await existing.destroy({ transaction });
    else await existing.update(normalizeOption(raw, true), { transaction });
  }
}

async function create(data = {}, baseUrl = '') {
  const scalars = validateScalars(data, false);
  const options = (data.options || []).map((o) => normalizeOption(o, false));

  const productId = await sequelize.transaction(async (transaction) => {
    const product = await Product.create(scalars, { transaction });

    if (data.category_ids?.length) {
      const ids = await ensureCategoriesExist(data.category_ids, transaction);
      await ProductCategory.bulkCreate(
        ids.map((category_id) => ({ product_id: product.id, category_id })),
        { transaction }
      );
    }

    for (const image of data.images || []) {
      const path = await storeImage(product.id, image);
      await ProductImage.create({ product_id: product.id, path, enabled: true }, { transaction });
    }

    for (const option of options) {
      await ProductOption.create({ ...option, product_id: product.id }, { transaction });
    }

    return product.id;
  });

  return findById(productId, baseUrl);
}

async function update(id, data = {}) {
  const product = await Product.findByPk(id);
  if (!product) throw HttpError.notFound('Produto não encontrado');

  const scalars = validateScalars(data, true);
  const filesToRemove = [];

  await sequelize.transaction(async (transaction) => {
    await product.update(scalars, { transaction });

    if (Array.isArray(data.category_ids)) {
      const ids = data.category_ids.length
        ? await ensureCategoriesExist(data.category_ids, transaction)
        : [];
      await ProductCategory.destroy({ where: { product_id: product.id }, transaction });
      await ProductCategory.bulkCreate(
        ids.map((category_id) => ({ product_id: product.id, category_id })),
        { transaction }
      );
    }

    if (Array.isArray(data.images)) await syncImages(product, data.images, transaction, filesToRemove);
    if (Array.isArray(data.options)) await syncOptions(product, data.options, transaction);
  });

  // só remove arquivos do disco depois do commit
  await Promise.all(filesToRemove.map(storage.removeFile));
}

async function remove(id) {
  const product = await Product.findByPk(id, { include: [{ model: ProductImage, as: 'images' }] });
  if (!product) throw HttpError.notFound('Produto não encontrado');

  const paths = product.images.map((img) => img.path);
  await sequelize.transaction(async (transaction) => {
    await ProductImage.destroy({ where: { product_id: product.id }, transaction });
    await ProductOption.destroy({ where: { product_id: product.id }, transaction });
    await ProductCategory.destroy({ where: { product_id: product.id }, transaction });
    await product.destroy({ transaction });
  });
  await Promise.all(paths.map(storage.removeFile));
}

module.exports = { search, findById, create, update, remove };
