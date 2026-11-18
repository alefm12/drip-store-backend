/**
 * Erro com status HTTP. Lançado pelos services e convertido em resposta
 * pelo middleware errorHandler.
 */
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }

  static badRequest(message = 'Dados da requisição inválidos', details) {
    return new HttpError(400, message, details);
  }

  static unauthorized(message = 'Token de autorização ausente ou inválido') {
    return new HttpError(401, message);
  }

  static notFound(message = 'Recurso não encontrado') {
    return new HttpError(404, message);
  }
}

module.exports = HttpError;
