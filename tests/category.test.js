const { app, request, sequelize, resetDatabase, createUserAndToken } = require('./setup');

let auth;

beforeAll(async () => {
  await resetDatabase();
  auth = { Authorization: `Bearer ${await createUserAndToken()}` };
});
afterAll(() => sequelize.close());

describe('Categorias', () => {
  test('POST /v1/category exige token (401) e valida dados (400)', async () => {
    expect((await request(app).post('/v1/category').send({ name: 'Shoes', slug: 'shoes' })).status).toBe(401);
    expect((await request(app).post('/v1/category').set(auth).send({ name: '' })).status).toBe(400);
  });

  test('POST /v1/category cria categorias (201)', async () => {
    const items = [
      { name: 'Shoes', slug: 'shoes', use_in_menu: true },
      { name: 'Offers', slug: 'offers', use_in_menu: true },
      { name: 'Black Friday', slug: 'black-friday', use_in_menu: false },
    ];
    for (const item of items) {
      const res = await request(app).post('/v1/category').set(auth).send(item);
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject(item);
    }
  });

  test('GET /v1/category/search pagina, filtra e limita campos', async () => {
    const all = await request(app).get('/v1/category/search?limit=-1');
    expect(all.status).toBe(200);
    expect(all.body).toMatchObject({ total: 3, limit: -1, page: 1 });
    expect(all.body.data).toHaveLength(3);

    const page2 = await request(app).get('/v1/category/search?limit=2&page=2');
    expect(page2.body.data).toHaveLength(1);
    expect(page2.body.data[0].slug).toBe('black-friday');

    const menu = await request(app).get('/v1/category/search?use_in_menu=true&fields=name,slug');
    expect(menu.body.total).toBe(2);
    expect(Object.keys(menu.body.data[0])).toEqual(['name', 'slug']);

    expect((await request(app).get('/v1/category/search?limit=abc')).status).toBe(400);
    expect((await request(app).get('/v1/category/search?fields=senha')).status).toBe(400);
  });

  test('GET /v1/category/:id retorna 200 e 404', async () => {
    const res = await request(app).get('/v1/category/1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 1, name: 'Shoes', slug: 'shoes', use_in_menu: true });
    expect((await request(app).get('/v1/category/999')).status).toBe(404);
  });

  test('PUT /v1/category/:id atualiza (204), valida (400) e 404', async () => {
    const payload = { name: 'Tênis', slug: 'tenis', use_in_menu: true };
    expect((await request(app).put('/v1/category/1').send(payload)).status).toBe(401);
    expect((await request(app).put('/v1/category/1').set(auth).send(payload)).status).toBe(204);
    expect((await request(app).get('/v1/category/1')).body.name).toBe('Tênis');
    expect((await request(app).put('/v1/category/1').set(auth).send({ name: 'x' })).status).toBe(400);
    expect((await request(app).put('/v1/category/999').set(auth).send(payload)).status).toBe(404);
  });

  test('DELETE /v1/category/:id remove (204) e 404', async () => {
    expect((await request(app).delete('/v1/category/3')).status).toBe(401);
    expect((await request(app).delete('/v1/category/3').set(auth)).status).toBe(204);
    expect((await request(app).delete('/v1/category/3').set(auth)).status).toBe(404);
  });
});
