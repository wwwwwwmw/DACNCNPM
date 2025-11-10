module.exports = (sequelize, DataTypes) => {
  return sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('admin','manager','employee'), allowNull: false, defaultValue: 'employee' },
    departmentId: { type: DataTypes.UUID, allowNull: true },
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true,
  });
};
