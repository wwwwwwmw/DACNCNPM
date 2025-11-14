const cron = require('node-cron');
const { Op } = require('sequelize');
const { Event, Participant } = require('../models');
const { notifyUsers } = require('../modules/notifications/notification.service');

function startReminderJob() {
	// Every 5 minutes, remind events starting within next 30 minutes that are approved
	cron.schedule('*/5 * * * *', async () => {
		try {
			const now = new Date();
			const in30 = new Date(now.getTime() + 30 * 60 * 1000);
			const events = await Event.findAll({ where: { start_time: { [Op.between]: [now, in30] }, status: 'approved' } });
			for (const e of events) {
				const parts = await Participant.findAll({ where: { eventId: e.id } });
				const ids = parts.map(p => p.userId).concat([e.createdById]);
				await notifyUsers(ids, 'Sắp đến giờ họp', e.title);
			}
		} catch (e) {
			console.warn('Reminder job error:', e.message);
		}
	});
}

module.exports = { startReminderJob };
