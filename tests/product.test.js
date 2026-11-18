const fs = require('fs');
const path = require('path');
const { app, request, sequelize, resetDatabase, createUserAndToken } = require('./setup');
const { PUBLIC_DIR } = require('../src/services/imageStorage');

// PNG 1x1 em base64
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

let auth;
let shoesId;
let offersId;
let productId;

beforeAll(async () => {
  await resetDatabase();
  auth = { Authorization: `Bearer ${await createUserAndToken()}` };
  shoesId = (await request(app).post('/v1/category').set(auth).send({ name: 'Shoes', slug: 'shoes' })).body.id;
  offersId = (await request(app).post('/v1/category').set(auth).send({ name: 'Offers', slug: 'offers' })).body.id;
});

afterAll(async () => {
  await sequelize.close();
  fs.rmSync(path.join(PUBLIC_DIR, 'media', 'products'), { recursive: true, force: true });
});

const baseProduct = () => ({
  enabled: true,
  name: 'Produto 01',
  slug: 'produto-01',
  stock: 10,
  description: 'Descrição do produto 01',
  price: 119.9,
  price_with_discount: 99.9,
  category_ids: [shoesId, offersId],
  images: [
    { type: 'image/png', content: PNG },
    { type: 'image/png', content: `data:image/png;base64,${PNG}` },
  ],
  options: [
    { title: 'Tamanho', shape: 'square', radius: '4px', type: 'text', value: ['PP', 'GG', 'M'] },
    { title: 'Cor', shape: 'circle', type: 'color', values: ['#000', '#333'] },
  ],
});

describe('Produtos', () => {
  test('POST /v1/product exige token (401) e valida (400)', async () => {
    expect((await request(app).post('/v1/product').send(baseProduct())).status).toBe(401);
    expect((await request(app).post('/v1/product').set(auth).send({ name: 'sem preço' })).status).toBe(400);
    expect(
      (await request(app).post('/v1/product').set(auth).send({ ...baseProduct(), category_ids: [999] })).status
    ).toBe(400);
  });

  test('POST /v1/product cria produto com imagens, opções e categorias (201)', async () => {
    const res = await request(app).post('/v1/product').set(auth).send(baseProduct());
    expect(res.status).toBe(201);
    productId = res.body.id;

    expect(res.body).toMatchObject({ name: 'Produto 01', price: 119.9, price_with_discount: 99.9 });
    expect(res.body.category_ids).toEqual([shoesId, offersId]);
    expect(res.body.images).toHaveLength(2);
    expect(res.body.images[0].content).toMatch(/^http:\/\/.+\/media\/products\/\d+\/.+\.png$/);
    expect(res.body.options[0]).toMatchObject({ title: 'Tamanho', radius: 4, values: ['PP', 'GG', 'M'] });
    expect(res.body.options[1]).toMatchObject({ shape: 'circle', type: 'color', values: ['#000', '#333'] });

    // a imagem foi salva e é servida estaticamente
    const imagePath = new URL(res.body.images[0].content).pathname;
    expect((await request(app).get(imagePath)).status).toBe(200);
  });

  test('GET /v1/product/:id retorna 200 e 404', async () => {
    const res = await request(app).get(`/v1/product/${productId}`);
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe('produto-01');
    expect((await request(app).get('/v1/product/999')).status).toBe(404);
  });

  test('GET /v1/product/search aplica filtros', async () => {
    await request(app).post('/v1/product').set(auth).send({
      name: 'Camiseta Básica', slug: 'camiseta', price: 49.9, price_with_discount: 49.9, category_ids: [offersId],
    });

    const all = await request(app).get('/v1/product/search');
    expect(all.status).toBe(200);
    expect(all.body).toMatchObject({ total: 2, limit: 12, page: 1 });

    const match = await request(app).get('/v1/product/search').query({ match: 'camiseta' });
    expect(match.body.total).toBe(1);

    const byCategory = await request(app).get(`/v1/product/search?category_ids=${shoesId}`);
    expect(byCategory.body.data.map((p) => p.name)).toEqual(['Produto 01']);

    const byPrice = await request(app).get('/v1/product/search?price-range=40-60');
    expect(byPrice.body.data.map((p) => p.name)).toEqual(['Camiseta Básica']);

    const optionId = (await request(app).get(`/v1/product/${productId}`)).body.options[0].id;
    const byOption = await request(app).get(`/v1/product/search?option[${optionId}]=GG,XX`);
    expect(byOption.body.total).toBe(1);
    const noOption = await request(app).get(`/v1/product/search?option[${optionId}]=XX`);
    expect(noOption.body.total).toBe(0);

    const fields = await request(app).get('/v1/product/search?fields=name,price&limit=1&page=2');
    expect(fields.body.data).toEqual([{ name: 'Camiseta Básica', price: 49.9 }]);

    expect((await request(app).get('/v1/product/search?price-range=abc')).status).toBe(400);
    expect((await request(app).get('/v1/product/search?page=0')).status).toBe(400);
  });

  test('PUT /v1/product/:id atualiza campos, imagens e opções (204)', async () => {
    const current = (await request(app).get(`/v1/product/${productId}`)).body;
    const [img1, img2] = current.images;
    const [opt1, opt2] = current.options;

    const res = await request(app)
      .put(`/v1/product/${productId}`)
      .set(auth)
      .send({
        name: 'Produto 01 atualizado',
        price: 49.9,
        price_with_discount: 0,
        category_ids: [offersId],
        images: [
          { type: 'image/png', content: PNG }, // nova
          { id: img2.id, deleted: true }, // removida
          { id: img1.id, content: img1.content }, // mantida
        ],
        options: [
          { id: opt1.id, deleted: true },
          { id: opt2.id, radius: '10px', value: ['42/43', '44/45'] },
          { title: 'Tipo', shape: 'square', type: 'text', values: ['100% algodão', '65% algodão'] },
        ],
      });
    expect(res.status).toBe(204);

    const updated = (await request(app).get(`/v1/product/${productId}`)).body;
    expect(updated).toMatchObject({ name: 'Produto 01 atualizado', price: 49.9, price_with_discount: 0 });
    expect(updated.category_ids).toEqual([offersId]);
    expect(updated.images.map((i) => i.id)).toContain(img1.id);
    expect(updated.images.map((i) => i.id)).not.toContain(img2.id);
    expect(updated.images).toHaveLength(2);
    expect(updated.options).toHaveLength(2);
    expect(updated.options[0]).toMatchObject({ id: opt2.id, radius: 10, values: ['42/43', '44/45'] });
    expect(updated.options[1]).toMatchObject({ title: 'Tipo', values: ['100% algodão', '65% algodão'] });
  });

  test('PUT /v1/product/:id retorna 401, 400 e 404', async () => {
    expect((await request(app).put(`/v1/product/${productId}`).send({ name: 'x' })).status).toBe(401);
    expect((await request(app).put(`/v1/product/${productId}`).set(auth).send({ price: 'caro' })).status).toBe(400);
    expect((await request(app).put('/v1/product/999').set(auth).send({ name: 'x' })).status).toBe(404);
  });

  test('DELETE /v1/product/:id remove (204) e 404', async () => {
    expect((await request(app).delete(`/v1/product/${productId}`)).status).toBe(401);
    expect((await request(app).delete(`/v1/product/${productId}`).set(auth)).status).toBe(204);
    expect((await request(app).get(`/v1/product/${productId}`)).status).toBe(404);
    expect((await request(app).delete(`/v1/product/${productId}`).set(auth)).status).toBe(404);
  });
});
