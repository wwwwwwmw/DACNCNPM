const { sequelize, DataTypes } = require('../config/db.config');

// Model factories
const defineUser = require('../modules/users/user.model');
const defineDepartment = require('../modules/departments/department.model');
const defineRoom = require('../modules/rooms/room.model');
const defineEvent = require('../modules/events/event.model');
const defineParticipant = require('../modules/participants/participant.model');
const defineNotification = require('../modules/notifications/notification.model');

// Initialize models
const Department = defineDepartment(sequelize, DataTypes);
const User = defineUser(sequelize, DataTypes);
const Room = defineRoom(sequelize, DataTypes);
const Event = defineEvent(sequelize, DataTypes);
const Participant = defineParticipant(sequelize, DataTypes);
const Notification = defineNotification(sequelize, DataTypes);

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

module.exports = {
  sequelize,
  Department,
  User,
  Room,
  Event,
  Participant,
  Notification,
};
