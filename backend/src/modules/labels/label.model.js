module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Label', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    color: { type: DataTypes.STRING, allowNull: false, defaultValue: '#2D9CDB' }
  }, {
    tableName: 'labels',
    timestamps: true,
    underscored: true,
  });
};
