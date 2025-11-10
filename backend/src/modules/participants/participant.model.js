module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Participant', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    eventId: { type: DataTypes.UUID, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: false },
    status: { type: DataTypes.ENUM('pending','accepted','declined'), allowNull: false, defaultValue: 'pending' },
  }, {
    tableName: 'participants',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['event_id'] },
      { fields: ['user_id'] },
    ]
  });
};
