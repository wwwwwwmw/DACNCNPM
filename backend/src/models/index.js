const { sequelize, DataTypes } = require('../config/db.config');

// Model factories
const defineUser = require('../modules/users/user.model');
const defineDepartment = require('../modules/departments/department.model');
const defineRoom = require('../modules/rooms/room.model');
const defineEvent = require('../modules/events/event.model');
const defineParticipant = require('../modules/participants/participant.model');
const defineNotification = require('../modules/notifications/notification.model');
const defineTask = require('../modules/tasks/task.model');
const defineTaskAssignment = require('../modules/tasks/task_assignment.model');
const defineProject = require('../modules/projects/project.model');
const defineLabel = require('../modules/labels/label.model');
const defineTaskLabel = require('../modules/tasks/task_label.model');

// Initialize models
const Department = defineDepartment(sequelize, DataTypes);
const User = defineUser(sequelize, DataTypes);
const Room = defineRoom(sequelize, DataTypes);
const Event = defineEvent(sequelize, DataTypes);
const Participant = defineParticipant(sequelize, DataTypes);
const Notification = defineNotification(sequelize, DataTypes);
const Project = defineProject(sequelize, DataTypes);
const Task = defineTask(sequelize, DataTypes);
const TaskAssignment = defineTaskAssignment(sequelize, DataTypes);
const Label = defineLabel(sequelize, DataTypes);
const TaskLabel = defineTaskLabel(sequelize, DataTypes);

// Associations
Department.hasMany(User, { foreignKey: 'departmentId' });
User.belongsTo(Department, { foreignKey: 'departmentId' });

Room.hasMany(Event, { foreignKey: 'roomId' });
Event.belongsTo(Room, { foreignKey: 'roomId' });

User.hasMany(Event, { foreignKey: 'createdById', as: 'createdEvents' });
Event.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });

Event.hasMany(Participant, { foreignKey: 'eventId' });
Participant.belongsTo(Event, { foreignKey: 'eventId' });
User.hasMany(Participant, { foreignKey: 'userId' });
Participant.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Notification, { foreignKey: 'userId' });
Notification.belongsTo(User, { foreignKey: 'userId' });

// Project & Task relations
Project.hasMany(Task, { foreignKey: 'projectId' });
Task.belongsTo(Project, { foreignKey: 'projectId' });
User.hasMany(Task, { foreignKey: 'createdById', as: 'createdTasks' });
Task.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });

// Task Label (many-to-many)
Task.belongsToMany(Label, { through: TaskLabel, foreignKey: 'taskId' });
Label.belongsToMany(Task, { through: TaskLabel, foreignKey: 'labelId' });

// Task Assignments
Task.hasMany(TaskAssignment, { foreignKey: 'taskId', as: 'assignments' });
TaskAssignment.belongsTo(Task, { foreignKey: 'taskId' });
User.hasMany(TaskAssignment, { foreignKey: 'userId', as: 'taskAssignments' });
TaskAssignment.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
  sequelize,
  Department,
  User,
  Room,
  Event,
  Participant,
  Notification,
  Project,
  Task,
  Label,
  TaskLabel,
  TaskAssignment,
};
