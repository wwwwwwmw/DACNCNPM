module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Project', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'projects',
    timestamps: true,
    underscored: true,
  });
};
