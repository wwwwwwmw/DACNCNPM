const { Notification } = require('../../models');
const { notifyUsers } = require('./notification.service');

async function listMyNotifications(req, res) {
  try {
    const list = await Notification.findAll({ where: { userId: req.user.id }, order: [['created_at','DESC']] });
    return res.json(list);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function createNotification(req, res) {
  try {
    const { toUserId, title, message } = req.body;
    if (!toUserId || !title || !message) return res.status(400).json({ message: 'Missing fields' });
    const created = await notifyUsers(toUserId, title, message);
    return res.status(201).json(created);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function markRead(req, res) {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Not found' });
    if (String(notification.userId) !== String(req.user.id)) return res.status(403).json({ message: 'Forbidden' });
    notification.is_read = true;
    await notification.save();
    return res.json(notification);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

module.exports = { listMyNotifications, createNotification, markRead };
