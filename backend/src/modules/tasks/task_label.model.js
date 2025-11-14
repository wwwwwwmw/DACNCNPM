module.exports = (sequelize, DataTypes) => {
  return sequelize.define('TaskLabel', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    taskId: { type: DataTypes.UUID, allowNull: false },
    labelId: { type: DataTypes.UUID, allowNull: false },
  }, {
    tableName: 'task_labels',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['task_id','label_id'] }
    ]
  });
};
