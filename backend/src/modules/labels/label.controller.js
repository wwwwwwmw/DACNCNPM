const { Label } = require('../../models');

async function listLabels(req, res) {
  try { const labels = await Label.findAll({ order: [['created_at','DESC']] }); return res.json(labels); } catch (e) { return res.status(500).json({ message: e.message }); }
}
async function createLabel(req, res) {
  try { const { name, color } = req.body; if (!name) return res.status(400).json({ message: 'Missing name' }); const label = await Label.create({ name, color: color || '#2D9CDB' }); return res.status(201).json(label); } catch (e) { return res.status(500).json({ message: e.message }); }
}
async function updateLabel(req, res) {
  try { const label = await Label.findByPk(req.params.id); if (!label) return res.status(404).json({ message: 'Not found' }); const { name, color } = req.body; if (name) label.name = name; if (color) label.color = color; await label.save(); return res.json(label); } catch (e) { return res.status(500).json({ message: e.message }); }
}
async function deleteLabel(req, res) {
  try { const label = await Label.findByPk(req.params.id); if (!label) return res.status(404).json({ message: 'Not found' }); await label.destroy(); return res.json({ message: 'Deleted' }); } catch (e) { return res.status(500).json({ message: e.message }); }
}
module.exports = { listLabels, createLabel, updateLabel, deleteLabel };