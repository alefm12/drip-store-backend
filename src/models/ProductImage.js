const { DataTypes } = require('sequelize');

/** Tabela product_images — path guarda o caminho relativo da imagem salva no servidor. */
module.exports = (sequelize) =>
  sequelize.define(
    'ProductImage',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'id' },
      },
      enabled: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
      path: { type: DataTypes.STRING, allowNull: false },
    },
    { tableName: 'product_images', timestamps: false }
  );
