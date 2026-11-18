/**
 * Funções auxiliares de validação e parsing de dados de entrada.
 */
const HttpError = require('./HttpError');

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;
const isEmail = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);

/** Converte um id de rota em inteiro positivo; caso contrário 404 (recurso não existe). */
function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw HttpError.notFound();
  return id;
}

/**
 * Lê limit/page da query string.
 * limit padrão 12, -1 = todos. page padrão 1.
 */
function parsePagination(query) {
  const limit = query.limit === undefined ? 12 : Number(query.limit);
  const page = query.page === undefined ? 1 : Number(query.page);

  if (!Number.isInteger(limit) || (limit < 1 && limit !== -1)) {
    throw HttpError.badRequest('O parâmetro limit deve ser um inteiro positivo ou -1');
  }
  if (!Number.isInteger(page) || page < 1) {
    throw HttpError.badRequest('O parâmetro page deve ser um inteiro maior que zero');
  }

  return {
    limit,
    page,
    sql: limit === -1 ? {} : { limit, offset: (page - 1) * limit },
  };
}

/** "name,slug" -> ['name','slug'] filtrando apenas campos permitidos. */
function parseFields(fieldsParam, allowed) {
  if (fieldsParam === undefined || fieldsParam === '') return null;
  const fields = String(fieldsParam)
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);
  const invalid = fields.filter((f) => !allowed.includes(f));
  if (invalid.length) {
    throw HttpError.badRequest(`Campos inválidos em fields: ${invalid.join(', ')}`);
  }
  return fields;
}

/** "true"/"1" -> true, "false"/"0" -> false, undefined -> undefined, outro -> erro */
function parseBooleanQuery(value, name) {
  if (value === undefined) return undefined;
  if (['true', '1'].includes(String(value))) return true;
  if (['false', '0'].includes(String(value))) return false;
  throw HttpError.badRequest(`O parâmetro ${name} deve ser true ou false`);
}

module.exports = {
  isNonEmptyString,
  isEmail,
  isNumber,
  parseId,
  parsePagination,
  parseFields,
  parseBooleanQuery,
};
