/**
 * Ponto de entrada: verifica a conexão com o banco e sobe o servidor HTTP.
 * As tabelas são criadas pelas migrations (npm run db:migrate).
 */
const app = require('./app');
const { sequelize } = require('./models');

const PORT = Number(process.env.PORT) || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    app.listen(PORT, () => {
      console.log(`API rodando em http://localhost:${PORT}`);
      console.log(`Documentação Swagger em http://localhost:${PORT}/docs`);
    });
  } catch (error) {
    console.error('Não foi possível conectar ao banco de dados:', error.message);
    process.exit(1);
  }
}

start();
