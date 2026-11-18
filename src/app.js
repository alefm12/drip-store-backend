/**
 * Configuração do Express (separado do server.js para facilitar os testes com supertest
 * e o deploy serverless em api/index.js).
 */
require('dotenv').config({ quiet: true });
const path = require('path');
const qs = require('qs');
const express = require('express');
const cors = require('cors');

const routes = require('./routes');
const swaggerDocument = require('./docs/swagger.json');
const swaggerPage = require('./docs/swaggerPage');
const { UPLOAD_DIR, PUBLIC_DIR } = require('./services/imageStorage');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// interpreta option[45]=GG,PP como { option: { 45: 'GG,PP' } }
// (parseArrays: false evita que o qs transforme option[45] em array e perca o ID)
app.set('query parser', (str) => qs.parse(str, { parseArrays: false }));
app.set('trust proxy', true); // URL das imagens com https atrás do proxy da hospedagem

app.use(cors());
app.use(express.json({ limit: '4mb' })); // imagens chegam em base64
app.use(express.static(PUBLIC_DIR)); // /media/seed/...
if (UPLOAD_DIR !== PUBLIC_DIR) app.use(express.static(UPLOAD_DIR)); // uploads em /tmp

// Documentação Swagger
app.get('/', (_req, res) => res.redirect('/docs'));
app.get('/docs/swagger.json', (_req, res) => res.json(swaggerDocument));
app.get('/docs', (_req, res) => res.type('html').send(swaggerPage));

app.use('/v1', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
