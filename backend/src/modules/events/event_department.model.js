module.exports = (sequelize, DataTypes) => {
  return sequelize.define('EventDepartment', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    eventId: { type: DataTypes.UUID, allowNull: false },
    departmentId: { type: DataTypes.UUID, allowNull: false },
  }, {
    tableName: 'event_departments',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['event_id','department_id'] }
    ]
  });
};