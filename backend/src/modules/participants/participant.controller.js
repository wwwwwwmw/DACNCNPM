const { Participant, Event, User } = require('../../models');

async function listParticipants(req, res) {
  try {
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ message: 'Missing eventId' });
    const list = await Participant.findAll({ where: { eventId }, include: [{ model: User, attributes: ['id','name','email'] }] });
    return res.json(list);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function addParticipants(req, res) {
  try {
    const { eventId, userIds } = req.body;
    if (!eventId || !Array.isArray(userIds)) return res.status(400).json({ message: 'Missing eventId or userIds' });
    const rows = await Participant.bulkCreate(userIds.map(uid => ({ eventId, userId: uid })), { ignoreDuplicates: true });
    return res.status(201).json(rows);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function updateParticipant(req, res) {
  try {
    const { status } = req.body;
    const part = await Participant.findByPk(req.params.id);
    if (!part) return res.status(404).json({ message: 'Not found' });
    // Only participant self can RSVP
    if (String(part.userId) !== String(req.user.id)) return res.status(403).json({ message: 'Forbidden' });
    if (!['pending','accepted','declined'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    part.status = status;
    await part.save();
    return res.json(part);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

module.exports = { listParticipants, addParticipants, updateParticipant };
