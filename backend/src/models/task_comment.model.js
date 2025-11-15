module.exports = (sequelize, DataTypes) => {
  return sequelize.define('TaskComment', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    taskId: { type: DataTypes.UUID, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
  }, {
    tableName: 'task_comments',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['task_id'] },
      { fields: ['user_id'] },
    ]
  });
};
