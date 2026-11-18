/**
 * Middlewares finais: rota não encontrada (404) e tratamento central de erros.
 */
const HttpError = require('../utils/HttpError');

function notFound(_req, _res, next) {
  next(HttpError.notFound('Rota não encontrada'));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  // JSON malformado no corpo da requisição
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'JSON inválido no corpo da requisição' });
  }
  // Erros de validação/unique do Sequelize viram 400
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      message: 'Dados da requisição inválidos',
      details: err.errors?.map((e) => e.message),
    });
  }
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({ message: 'Referência inválida a outro recurso' });
  }
  if (err instanceof HttpError) {
    const body = { message: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }

  console.error(err);
  return res.status(500).json({ message: 'Erro interno do servidor' });
}

module.exports = { notFound, errorHandler };
