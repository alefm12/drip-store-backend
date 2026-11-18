# Drip Store API — Projeto Back-end

API REST da loja **Drip Store**, desenvolvida para o projeto final de Back-end da Digital College,
seguindo o escopo de [digitalcollegebr/projeto-backend](https://github.com/digitalcollegebr/projeto-backend).

**Desenvolvido por:** ALEF MATHEUS TEIXEIRA DE SOUSA

**API publicada:** https://drip-store-backend-mu.vercel.app

**Documentação (Swagger):** https://drip-store-backend-mu.vercel.app/docs

**Front-end que consome a API:** https://drip-store-frontend-xi.vercel.app

## Tecnologias

| Uso | Tecnologia |
| --- | --- |
| Servidor | Node.js + Express 5 |
| Banco de dados | MySQL + Sequelize (ORM, migrations e seeders) |
| Autenticação | JWT (`jsonwebtoken`) + senhas com hash `bcrypt` |
| Configuração | dotenv |
| Testes | Jest + Supertest (SQLite em memória) |
| Documentação | Swagger (OpenAPI 3) em `/docs` |
| Desenvolvimento | Nodemon |

## Estrutura (padrão MVC + camada de services)

```
src/
├── config/        # configuração do banco por ambiente
├── controllers/   # recebem a requisição HTTP e devolvem a resposta
├── database/
│   ├── migrations/  # criação das 6 tabelas
│   └── seeders/     # dados de demonstração
├── docs/          # swagger.json
├── middleware/    # autenticação JWT e tratamento de erros
├── models/        # models Sequelize e associações
├── routes/        # rotas /v1
├── services/      # regras de negócio e validação
├── utils/         # HttpError e validadores
├── app.js         # configuração do Express
└── server.js      # inicialização
tests/             # testes de integração (21 testes)
```

## Como rodar

Pré-requisitos: **Node.js 18+** e **MySQL** (local ou via Docker).

```bash
# 1. instalar dependências
npm install

# 2. configurar variáveis de ambiente
cp .env.example .env        # ajuste usuário/senha/porta do MySQL

# 3. (opcional) subir um MySQL com Docker — já casa com o .env.example
docker compose up -d

# 4. criar o banco, as tabelas e os dados de demonstração
npm run db:create
npm run db:migrate
npm run db:seed

# 5. iniciar
npm run dev      # com nodemon
# ou
npm start
```

- API: `http://localhost:3000/v1`
- Documentação Swagger: `http://localhost:3000/docs`
- Usuário do seed: `admin@dripstore.com` / `123456`

### Testes

```bash
npm test
```

Os testes usam SQLite em memória, então **não precisam de MySQL**.

## Endpoints

| Método | Rota | Auth | Sucesso |
| --- | --- | :---: | --- |
| POST | `/v1/user/token` | | 200 `{ token }` |
| GET | `/v1/user/:id` | | 200 |
| POST | `/v1/user` | | 201 |
| PUT | `/v1/user/:id` | ✔ | 204 |
| DELETE | `/v1/user/:id` | ✔ | 204 |
| GET | `/v1/category/search` | | 200 |
| GET | `/v1/category/:id` | | 200 |
| POST | `/v1/category` | ✔ | 201 |
| PUT | `/v1/category/:id` | ✔ | 204 |
| DELETE | `/v1/category/:id` | ✔ | 204 |
| GET | `/v1/product/search` | | 200 |
| GET | `/v1/product/:id` | | 200 |
| POST | `/v1/product` | ✔ | 201 |
| PUT | `/v1/product/:id` | ✔ | 204 |
| DELETE | `/v1/product/:id` | ✔ | 204 |

Rotas com ✔ exigem o cabeçalho `Authorization: Bearer <jwt>`.

### Filtros de busca

`/v1/category/search` — `limit` (padrão 12, `-1` = todos), `page`, `fields=name,slug`, `use_in_menu=true`

`/v1/product/search` — `limit`, `page`, `fields=name,images,price`, `match=Tênis`,
`category_ids=1,7`, `price-range=100-200`, `option[45]=GG,PP`

### Exemplo

```bash
# login
curl -X POST http://localhost:3000/v1/user/token \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dripstore.com","password":"123456"}'

# criar categoria
curl -X POST http://localhost:3000/v1/category \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"name":"Shoes","slug":"shoes","use_in_menu":true}'
```

## Decisões de implementação

- **Respostas HTTP:** 200, 201, 204 (sem corpo), 400, 401 e 404, conforme a documentação.
  Erros devolvem `{ "message": "...", "details": [...] }`.
- **Token ausente ou inválido → 401.** A documentação diz 400 em um trecho e 401 em todos os endpoints;
  seguimos os endpoints (401 é o código correto para falta de credenciais).
- **Cadastro de usuário e geração de token** são públicos (sem eles não haveria como obter o primeiro token).
- **Imagens:** recebidas em base64 (com ou sem prefixo `data:`), salvas em `public/media/products/<id>/`;
  o banco guarda só o caminho relativo e a API devolve a URL completa.
- **Opções:** aceita `values` ou `value` (a documentação usa os dois), em lista ou texto; `radius: "4px"` vira `4`.
  No banco os valores ficam separados por vírgula, como pede o requisito.
- **Atualização de produto:** `{ id, deleted: true }` remove imagem/opção; `{ id, ...campos }` atualiza;
  item sem `id` é criado. Tudo dentro de uma transação.
- **Senha** nunca é retornada (default scope do model exclui a coluna).
- **Índices** em `products.slug`, `products.price` e `product_categories.category_id` para as buscas.

## Deploy (Vercel + MySQL na nuvem)

O projeto já está pronto para rodar como função serverless na Vercel (`api/index.js` + `vercel.json`).

1. Crie um banco MySQL gratuito na nuvem (ex.: [Aiven](https://aiven.io/free-mysql-database)).
2. Rode as migrations e o seed apontando para ele (com as variáveis do banco no `.env`):
   ```bash
   npm run db:migrate:prod
   npm run db:seed:prod
   ```
3. Na Vercel, importe o repositório e configure as variáveis:
   `NODE_ENV=production`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`, `DB_SSL=true`,
   `JWT_SECRET`, `UPLOAD_DIR=/tmp`.

> Na Vercel o disco é temporário: imagens enviadas por upload ficam disponíveis apenas enquanto a função estiver ativa.
> As imagens do seed vêm junto com o projeto e funcionam sempre.
