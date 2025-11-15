module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Task', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    start_time: { type: DataTypes.DATE, allowNull: true },
    end_time: { type: DataTypes.DATE, allowNull: true },
    status: { type: DataTypes.ENUM('todo','in_progress','completed'), allowNull: false, defaultValue: 'todo' },
    projectId: { type: DataTypes.UUID, allowNull: true },
    createdById: { type: DataTypes.UUID, allowNull: false },
    priority: { type: DataTypes.ENUM('low','normal','high','urgent'), allowNull: false, defaultValue: 'normal' },
    departmentId: { type: DataTypes.UUID, allowNull: true },
    assignment_type: { type: DataTypes.ENUM('open','direct'), allowNull: false, defaultValue: 'open' },
    capacity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    // Trọng số do người dùng nhập (0-100). Nếu null sẽ được phân bổ tự động.
    weight: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 0, max: 100 } }
  }, {
    tableName: 'tasks',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['project_id'] },
      { fields: ['created_by_id'] },
      { fields: ['status'] },
      { fields: ['department_id'] }
    ]
  });
};
