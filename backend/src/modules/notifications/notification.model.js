module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Notification', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    is_read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    ref_type: { type: DataTypes.STRING, allowNull: true },
    ref_id: { type: DataTypes.UUID, allowNull: true },
  }, {
    tableName: 'notifications',
    timestamps: true,
    underscored: true,
  });
};
