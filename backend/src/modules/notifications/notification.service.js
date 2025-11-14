const { Notification } = require('../../models');
const { emitToUser } = require('../../utils/socket');

async function notifyUsers(userIds, title, message, extra = {}) {
  if (!Array.isArray(userIds)) userIds = [userIds];
  const payloads = userIds.map((userId) => ({ userId, title, message, ref_type: extra.ref_type || null, ref_id: extra.ref_id || null }));
  const created = await Notification.bulkCreate(payloads);
  for (const n of created) {
    emitToUser(n.userId, 'receiveNotification', { id: n.id, title: n.title, message: n.message, is_read: n.is_read, ref_type: n.ref_type, ref_id: n.ref_id });
  }
  return created;
}

module.exports = { notifyUsers };
