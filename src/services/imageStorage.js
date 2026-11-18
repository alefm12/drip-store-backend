/**
 * Armazenamento das imagens de produto em disco (pasta public/media).
 * As imagens chegam em base64 e são salvas com nome único; no banco fica
 * apenas o caminho relativo (ex.: "media/products/1/abc.png").
 */
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const HttpError = require('../utils/HttpError');

const PUBLIC_DIR = path.resolve(__dirname, '..', '..', 'public');
// Pasta onde os uploads são gravados. Em hospedagem serverless (ex.: Vercel) o disco do
// projeto é somente leitura, então UPLOAD_DIR aponta para um diretório gravável (/tmp).
const UPLOAD_DIR = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : PUBLIC_DIR;

const EXTENSIONS = {
  'image/png': 'png',
  'image/jpg': 'jpg',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const isUrl = (value) => /^https?:\/\//i.test(value);

/** Salva uma imagem base64 e devolve o caminho relativo. */
async function saveBase64(productId, type, content) {
  // aceita tanto "data:image/png;base64,AAAA" quanto só "AAAA"
  const match = /^data:([\w/+.-]+);base64,(.*)$/s.exec(content);
  const mime = (match ? match[1] : type || '').toLowerCase();
  const base64 = match ? match[2] : content;

  const ext = EXTENSIONS[mime];
  if (!ext) throw HttpError.badRequest(`Tipo de imagem não suportado: ${mime || 'não informado'}`);

  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length) throw HttpError.badRequest('Conteúdo da imagem vazio ou inválido');

  const relative = path.posix.join('media', 'products', String(productId), `${crypto.randomUUID()}.${ext}`);
  const absolute = path.join(UPLOAD_DIR, relative);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, buffer);
  return relative;
}

/** Remove o arquivo físico (ignora se não existir ou se for URL externa). */
async function removeFile(relativePath) {
  if (!relativePath || isUrl(relativePath)) return;
  await fs.rm(path.join(UPLOAD_DIR, relativePath), { force: true });
}

/** Converte o path salvo em URL absoluta para a resposta da API. */
function toUrl(baseUrl, relativePath) {
  if (isUrl(relativePath)) return relativePath;
  return `${baseUrl}/${relativePath}`;
}

module.exports = { saveBase64, removeFile, toUrl, isUrl, PUBLIC_DIR, UPLOAD_DIR };
