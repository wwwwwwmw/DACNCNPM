const { Notification } = require('../../models');
const { emitToUser } = require('../../utils/socket');

async function notifyUsers(userIds, title, message) {
  if (!Array.isArray(userIds)) userIds = [userIds];
  const payloads = userIds.map((userId) => ({ userId, title, message }));
  const created = await Notification.bulkCreate(payloads);
  for (const n of created) {
    emitToUser(n.userId, 'receiveNotification', { id: n.id, title: n.title, message: n.message, is_read: n.is_read });
  }
  return created;
}

module.exports = { notifyUsers };
