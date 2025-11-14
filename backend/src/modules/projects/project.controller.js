const { Project, Task } = require('../../models');

async function listProjects(req, res) {
  try {
    const projects = await Project.findAll({
      include: [{ model: Task, attributes: ['id','status'] }],
      order: [['created_at','DESC']]
    });
    // attach progress counts
    const mapped = projects.map(p => {
      const tasks = p.Tasks || [];
      const total = tasks.length || 0;
      const completed = tasks.filter(t=> t.status==='completed').length;
      const progress = total === 0 ? 0 : Math.round((completed/total)*100);
      const json = p.toJSON();
      json.progress = progress;
      return json;
    });
    return res.json(mapped);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function createProject(req, res) {
  try {
    const { name, description, createEvent, eventStart, eventEnd, roomId } = req.body;
    if (!name) return res.status(400).json({ message: 'Missing name' });
    const project = await Project.create({ name, description });
    // Optionally create a calendar event for this project timeframe
    if (createEvent && eventStart && eventEnd) {
      try {
        const { Event } = require('../../models');
        await Event.create({
          title: `[Dự án] ${name}`,
          description: description || `Lịch công tác cho dự án ${name}`,
          start_time: new Date(eventStart),
          end_time: new Date(eventEnd),
          roomId: roomId || null,
          status: 'approved',
          createdById: req.user.id,
        });
      } catch (e) { console.warn('createProject event error', e.message); }
    }
    return res.status(201).json(project);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function updateProject(req, res) {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ message: 'Not found' });
    const { name, description } = req.body;
    if (name) project.name = name;
    if (typeof description !== 'undefined') project.description = description;
    await project.save();
    return res.json(project);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function deleteProject(req, res) {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ message: 'Not found' });
    await project.destroy();
    return res.json({ message: 'Deleted' });
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

module.exports = { listProjects, createProject, updateProject, deleteProject };