const { sequelize, Event, User, Department } = require('../../models');
const { Op } = require('sequelize');

async function eventsByMonth(req, res) {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    const rows = await Event.findAll({
      attributes: [
        [sequelize.fn('date_part', 'month', sequelize.col('start_time')), 'month'],
        [sequelize.fn('count', sequelize.col('id')), 'count']
      ],
      where: { start_time: { [Op.gte]: start, [Op.lt]: end } },
      group: [sequelize.fn('date_part', 'month', sequelize.col('start_time'))],
      order: [[sequelize.literal('month'), 'ASC']]
    });
    return res.json(rows);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function eventsByDepartment(req, res) {
  try {
    const rows = await Event.findAll({
      attributes: [
        [sequelize.col('createdBy.department.name'), 'department'],
        [sequelize.fn('count', sequelize.col('Event.id')), 'count']
      ],
      include: [{ model: User, as: 'createdBy', attributes: [], include: [{ model: Department, attributes: [] }] }],
      group: [sequelize.col('createdBy.department.name')],
      raw: true,
    });
    return res.json(rows);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

module.exports = { eventsByMonth, eventsByDepartment };
