const { Department } = require('../../models');

async function listDepartments(req, res) {
  try {
    const list = await Department.findAll();
    return res.json(list);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function createDepartment(req, res) {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Missing name' });
    const dep = await Department.create({ name, description });
    return res.status(201).json(dep);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function updateDepartment(req, res) {
  try {
    const { name, description } = req.body;
    const dep = await Department.findByPk(req.params.id);
    if (!dep) return res.status(404).json({ message: 'Not found' });
    if (name) dep.name = name;
    if (typeof description !== 'undefined') dep.description = description;
    await dep.save();
    return res.json(dep);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function deleteDepartment(req, res) {
  try {
    const dep = await Department.findByPk(req.params.id);
    if (!dep) return res.status(404).json({ message: 'Not found' });
    await dep.destroy();
    return res.json({ message: 'Deleted' });
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

module.exports = { listDepartments, createDepartment, updateDepartment, deleteDepartment };
