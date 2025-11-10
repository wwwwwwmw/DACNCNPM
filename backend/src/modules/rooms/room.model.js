module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Room', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    location: { type: DataTypes.STRING, allowNull: true },
    capacity: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  }, {
    tableName: 'rooms',
    timestamps: true,
    underscored: true,
  });
};
