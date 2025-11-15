const { Project, Task } = require('../../models');

async function listProjects(req, res) {
  try {
    const where = {};
    if (req.user && req.user.role === 'manager') {
      where.departmentId = req.user.departmentId || null;
    }
    const projects = await Project.findAll({
      where,
      include: [{ model: Task, attributes: ['id','status','weight'], include: [{ model: require('../../models').TaskAssignment, as: 'assignments', attributes: ['progress','status'] }] }],
      order: [['created_at','DESC']]
    });

    function computeEffectiveWeights(tasks) {
      const explicit = tasks.filter(t => typeof t.weight === 'number' && t.weight !== null);
      const auto = tasks.filter(t => t.weight === null || typeof t.weight === 'undefined');
      const sumExplicit = explicit.reduce((a,b)=> a + (b.weight||0), 0);
      let remaining = 100 - sumExplicit;
      if (remaining < 0) remaining = 0;
      const map = {};
      explicit.forEach(t => { map[t.id] = t.weight; });
      if (auto.length) {
        const base = Math.floor(remaining / auto.length);
        let rem = remaining % auto.length;
        auto.forEach(t => {
          let w = base;
          if (rem > 0) { w += 1; rem -= 1; }
          map[t.id] = w;
        });
      }
      return map;
    }

    const mapped = projects.map(p => {
      const tasks = p.Tasks || [];
      const weightMap = computeEffectiveWeights(tasks);
      let totalWeightUsed = 0;
      let progressWeightedSum = 0;
      tasks.forEach(t => {
        const eff = weightMap[t.id] || 0;
        totalWeightUsed += eff;
        // Tính tiến độ task: nếu có assignments dùng trung bình progress, nếu không fallback theo status
        let taskProgress = 0;
        const assigns = t.assignments || [];
        if (assigns.length) {
          const relevant = assigns.filter(a => a.status !== 'rejected');
          if (relevant.length) {
            const sum = relevant.reduce((a,b)=> a + (b.progress||0), 0);
            taskProgress = sum / (relevant.length * 100); // 0..1
          }
        } else {
          taskProgress = t.status === 'completed' ? 1 : 0;
        }
        progressWeightedSum += eff * taskProgress;
      });
      const overall = totalWeightUsed === 0 ? 0 : Math.round((progressWeightedSum / 100));
      const json = p.toJSON();
      json.progress = overall; // phần trăm
      json.tasks_effective_weights = weightMap; // mapping id->weight để client có thể tham khảo nếu cần
      return json;
    });
    return res.json(mapped);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function createProject(req, res) {
  try {
    const { name, description, createEvent, eventStart, eventEnd, roomId, departmentId } = req.body;
    if (!name) return res.status(400).json({ message: 'Missing name' });
    let deptId = null;
    if (req.user.role === 'manager') deptId = req.user.departmentId || null;
    if (req.user.role === 'admin' && departmentId) deptId = departmentId;
    const project = await Project.create({ name, description, departmentId: deptId });
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
    if (req.user.role === 'manager' && String(project.departmentId) !== String(req.user.departmentId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
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
    if (req.user.role === 'manager' && String(project.departmentId) !== String(req.user.departmentId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await project.destroy();
    return res.json({ message: 'Deleted' });
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

module.exports = { listProjects, createProject, updateProject, deleteProject };