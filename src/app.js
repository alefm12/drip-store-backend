/**
 * Configuração do Express (separado do server.js para facilitar os testes com supertest).
 */
require('dotenv').config({ quiet: true });
const path = require('path');
const qs = require('qs');
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

const routes = require('./routes');
const swaggerDocument = require('./docs/swagger.json');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// interpreta option[45]=GG,PP como { option: { 45: 'GG,PP' } }
// (parseArrays: false evita que o qs transforme option[45] em array e perca o ID)
app.set('query parser', (str) => qs.parse(str, { parseArrays: false }));

app.use(cors());
app.use(express.json({ limit: '20mb' })); // imagens chegam em base64
app.use(express.static(path.resolve(__dirname, '..', 'public'))); // /media/...

app.get('/', (_req, res) => res.redirect('/docs'));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/v1', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
