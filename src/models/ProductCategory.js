const { DataTypes } = require('sequelize');

/** Tabela de ligação product_categories (produto N:N categoria). */
module.exports = (sequelize) =>
  sequelize.define(
    'ProductCategory',
    {
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'products', key: 'id' },
      },
      category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'categories', key: 'id' },
      },
    },
    { tableName: 'product_categories', timestamps: false }
  );
