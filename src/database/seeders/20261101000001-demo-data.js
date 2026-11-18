'use strict';

/**
 * Dados de demonstração: 1 usuário, categorias e produtos com imagens/opções.
 * Usuário: admin@dripstore.com / 123456
 */
const bcrypt = require('bcryptjs');

const CATEGORIES = [
  { name: 'Tênis', slug: 'tenis', use_in_menu: true },
  { name: 'Camisetas', slug: 'camisetas', use_in_menu: true },
  { name: 'Calças', slug: 'calcas', use_in_menu: true },
  { name: 'Bonés', slug: 'bones', use_in_menu: true },
  { name: 'Headphones', slug: 'headphones', use_in_menu: true },
  { name: 'Adidas', slug: 'adidas', use_in_menu: false },
  { name: 'Nike', slug: 'nike', use_in_menu: false },
  { name: 'Puma', slug: 'puma', use_in_menu: false },
  { name: 'K-Swiss', slug: 'k-swiss', use_in_menu: false },
];

const BRANDS = ['Adidas', 'Nike', 'Puma', 'K-Swiss'];
const MODELS = ['Ultraboost', 'Air Max', 'Suede Classic', 'Court Pro', 'Runner', 'Street'];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const stamp = { created_at: now, updated_at: now };

    await queryInterface.bulkInsert('users', [
      {
        firstname: 'Admin',
        surname: 'Drip Store',
        email: 'admin@dripstore.com',
        password: await bcrypt.hash('123456', 10),
        ...stamp,
      },
    ]);

    await queryInterface.bulkInsert('categories', CATEGORIES.map((c) => ({ ...c, ...stamp })));
    const [categories] = await queryInterface.sequelize.query('SELECT id, name FROM categories');
    const categoryId = Object.fromEntries(categories.map((c) => [c.name, c.id]));

    // 16 tênis de demonstração
    const products = Array.from({ length: 16 }, (_, i) => {
      const brand = BRANDS[i % BRANDS.length];
      const model = MODELS[i % MODELS.length];
      const price = 200 + (i % 5) * 50;
      return {
        name: `Tênis ${brand} ${model} ${i + 1}`,
        slug: `tenis-${brand.toLowerCase()}-${model.toLowerCase().replace(/\s+/g, '-')}-${i + 1}`,
        enabled: true,
        use_in_menu: false,
        stock: 10 + i,
        description: `Tênis ${brand} ${model}, confortável e estiloso para o dia a dia.`,
        price,
        price_with_discount: i % 2 === 0 ? Math.round(price * 0.75 * 100) / 100 : price,
        ...stamp,
      };
    });
    await queryInterface.bulkInsert('products', products);
    const [rows] = await queryInterface.sequelize.query('SELECT id, name FROM products ORDER BY id');

    const images = [];
    const options = [];
    const links = [];
    rows.forEach((product, i) => {
      const thumb = (i % 5) + 1;
      images.push({ product_id: product.id, enabled: true, path: `media/seed/product-thumb-${thumb}.jpeg` });
      [1, 2, 3, 4, 5].forEach((n) =>
        images.push({ product_id: product.id, enabled: true, path: `media/seed/produc-image-${n}.jpeg` })
      );

      options.push(
        { product_id: product.id, title: 'Tamanho', shape: 'square', radius: 4, type: 'text', values: '39,40,41,42,43' },
        { product_id: product.id, title: 'Cor', shape: 'circle', radius: 0, type: 'color', values: '#6FEEFF,#FF6969,#5E5E5E,#6D70B7' }
      );

      links.push(
        { product_id: product.id, category_id: categoryId['Tênis'] },
        { product_id: product.id, category_id: categoryId[BRANDS[i % BRANDS.length]] }
      );
    });

    await queryInterface.bulkInsert('product_images', images);
    await queryInterface.bulkInsert('product_options', options);
    await queryInterface.bulkInsert('product_categories', links);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('product_categories', null, {});
    await queryInterface.bulkDelete('product_options', null, {});
    await queryInterface.bulkDelete('product_images', null, {});
    await queryInterface.bulkDelete('products', null, {});
    await queryInterface.bulkDelete('categories', null, {});
    await queryInterface.bulkDelete('users', { email: 'admin@dripstore.com' }, {});
  },
};
