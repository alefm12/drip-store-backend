/**
 * Middleware de autenticação JWT.
 * Exige o cabeçalho "Authorization: Bearer <jwt>" e anexa o payload em req.user.
 */
const jwt = require('jsonwebtoken');
const HttpError = require('../utils/HttpError');

function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(HttpError.unauthorized('Cabeçalho Authorization: Bearer <jwt> é obrigatório'));
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return next(HttpError.unauthorized('Token inválido ou expirado'));
  }
}

module.exports = authenticate;
