module.exports = (sequelize, DataTypes) => {
  return sequelize.define('TaskAssignment', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    taskId: { type: DataTypes.UUID, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: false },
    status: { type: DataTypes.ENUM('applied','assigned','accepted','rejected','completed'), allowNull: false, defaultValue: 'applied' },
    progress: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    reject_reason: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'task_assignments',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['task_id'] },
      { fields: ['user_id'] },
    ]
  });
};
