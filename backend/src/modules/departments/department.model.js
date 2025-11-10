module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Department', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    description: { type: DataTypes.STRING, allowNull: true },
  }, {
    tableName: 'departments',
    timestamps: true,
    underscored: true,
  });
};
