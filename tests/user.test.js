const { app, request, sequelize, resetDatabase, createUserAndToken } = require('./setup');

beforeAll(resetDatabase);
afterAll(() => sequelize.close());

describe('Usuários', () => {
  let token;
  let userId;

  test('POST /v1/user cadastra usuário (201) sem retornar a senha', async () => {
    const res = await request(app).post('/v1/user').send({
      firstname: 'Maria',
      surname: 'Silva',
      email: 'maria@mail.com',
      password: '123@123',
      confirmPassword: '123@123',
    });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(Number), firstname: 'Maria', surname: 'Silva', email: 'maria@mail.com' });
    userId = res.body.id;
  });

  test('POST /v1/user rejeita senhas diferentes (400)', async () => {
    const res = await request(app).post('/v1/user').send({
      firstname: 'A', surname: 'B', email: 'x@mail.com', password: '123456', confirmPassword: '654321',
    });
    expect(res.status).toBe(400);
  });

  test('POST /v1/user rejeita email duplicado (400)', async () => {
    const res = await request(app).post('/v1/user').send({
      firstname: 'A', surname: 'B', email: 'maria@mail.com', password: '123456', confirmPassword: '123456',
    });
    expect(res.status).toBe(400);
  });

  test('POST /v1/user/token gera JWT (200) e rejeita senha errada (400)', async () => {
    const ok = await request(app).post('/v1/user/token').send({ email: 'maria@mail.com', password: '123@123' });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toEqual(expect.any(String));
    token = ok.body.token;

    const wrong = await request(app).post('/v1/user/token').send({ email: 'maria@mail.com', password: 'errada' });
    expect(wrong.status).toBe(400);
  });

  test('GET /v1/user/:id retorna 200 e 404', async () => {
    const ok = await request(app).get(`/v1/user/${userId}`);
    expect(ok.status).toBe(200);
    expect(ok.body.email).toBe('maria@mail.com');
    expect(ok.body.password).toBeUndefined();

    expect((await request(app).get('/v1/user/9999')).status).toBe(404);
  });

  test('PUT /v1/user/:id exige token (401) e atualiza (204)', async () => {
    const payload = { firstname: 'Maria', surname: 'Souza', email: 'maria@mail.com' };
    expect((await request(app).put(`/v1/user/${userId}`).send(payload)).status).toBe(401);
    expect((await request(app).put(`/v1/user/${userId}`).set('Authorization', 'Bearer invalido').send(payload)).status).toBe(401);

    const res = await request(app).put(`/v1/user/${userId}`).set('Authorization', `Bearer ${token}`).send(payload);
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect((await request(app).get(`/v1/user/${userId}`)).body.surname).toBe('Souza');
  });

  test('PUT /v1/user/:id com dados inválidos (400) e id inexistente (404)', async () => {
    const auth = { Authorization: `Bearer ${token}` };
    expect((await request(app).put(`/v1/user/${userId}`).set(auth).send({ email: 'x' })).status).toBe(400);
    expect(
      (await request(app).put('/v1/user/9999').set(auth).send({ firstname: 'a', surname: 'b', email: 'a@b.com' })).status
    ).toBe(404);
  });

  test('DELETE /v1/user/:id remove (204) e depois retorna 404', async () => {
    const otherToken = await createUserAndToken('other@mail.com');
    const auth = { Authorization: `Bearer ${otherToken}` };
    expect((await request(app).delete(`/v1/user/${userId}`)).status).toBe(401);
    expect((await request(app).delete(`/v1/user/${userId}`).set(auth)).status).toBe(204);
    expect((await request(app).delete(`/v1/user/${userId}`).set(auth)).status).toBe(404);
  });
});
