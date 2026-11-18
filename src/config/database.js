/**
 * Configuração do banco de dados por ambiente.
 * Usado tanto pela aplicação (src/models/index.js) quanto pelo sequelize-cli (migrations/seeders).
 * - development/production: MySQL (variáveis no arquivo .env)
 * - test: SQLite em memória, para os testes rodarem sem depender de um servidor MySQL
 */
require('dotenv').config({ quiet: true });

const common = {
  define: {
    underscored: true, // colunas snake_case: created_at, updated_at, product_id...
    timestamps: true,
  },
  logging: false,
};

// require explícito do driver: o Sequelize carrega o mysql2 de forma dinâmica e,
// em hospedagem serverless (Vercel), o empacotador não incluiria o pacote no deploy.
const mysql = { dialect: 'mysql', dialectModule: require('mysql2') };

module.exports = {
  development: {
    ...common,
    ...mysql,
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'drip_store',
  },
  production: {
    ...common,
    ...mysql,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    // bancos MySQL na nuvem (Aiven, TiDB, etc.) exigem conexão SSL
    dialectOptions: process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {},
    pool: { max: 3, min: 0, idle: 10000 },
  },
  test: {
    ...common,
    dialect: 'sqlite',
    storage: ':memory:',
  },
};
