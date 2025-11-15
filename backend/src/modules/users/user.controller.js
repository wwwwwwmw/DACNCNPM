const bcrypt = require('bcryptjs');
const { User, Department } = require('../../models');

async function listUsers(req, res) {
  try {
const { limit=50, offset=0 } = req.query;
const users = await User.findAll({
  attributes: { exclude: ['password'] },
  include: [{ model: Department }],
  limit: Number(limit), offset: Number(offset),
  order: [['created_at','DESC']]
});    
// Manager scope: filter by their department only
if (req.user && req.user.role === 'manager') {
  const deptId = req.user.departmentId || null;
  return res.json(users.filter(u => String(u.departmentId||'') === String(deptId||'')));
}
return res.json(users);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

async function getUser(req, res) {
  try {
    const user = await User.findByPk(req.params.id, { attributes: { exclude: ['password'] }, include: [{ model: Department }] });
    if (!user) return res.status(404).json({ message: 'Not found' });
    // self or admin check is in middleware
    return res.json(user);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

async function updateUser(req, res) {
  try {
    const { name, departmentId, password, contact, employeePin, avatarUrl, role } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Not found' });
    // self or admin enforced by middleware; only admin can change role
    if (name) user.name = name;
    if (typeof departmentId !== 'undefined') user.departmentId = departmentId;
    if (password) user.password = await bcrypt.hash(password, 10);
    if (typeof contact !== 'undefined') user.contact = contact;
    if (typeof employeePin !== 'undefined') user.employee_pin = employeePin;
    if (typeof avatarUrl !== 'undefined') user.avatar_url = avatarUrl;
    if (typeof role !== 'undefined') {
      if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only admin can change role' });
      user.role = role;
    }
    await user.save();
    const plain = user.toJSON();
    delete plain.password;
    return res.json(plain);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

async function createUser(req, res) {
  try {
    const { name, email, password, role = 'employee', departmentId, contact, employeePin, avatarUrl } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Missing required fields' });
    if (!(req.user.role === 'admin' || req.user.role === 'manager')) return res.status(403).json({ message: 'Forbidden' });
    // Manager restrictions
    if (req.user.role === 'manager') {
      if (role !== 'employee') return res.status(403).json({ message: 'Manager can only create employees' });
      if (departmentId && String(departmentId) !== String(req.user.departmentId)) {
        return res.status(403).json({ message: 'Cannot create user for another department' });
      }
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash, role, departmentId: departmentId || (req.user.role==='manager'? req.user.departmentId : null) || null, contact, employee_pin: employeePin, avatar_url: avatarUrl });
    const plain = user.toJSON();
    delete plain.password;
    return res.status(201).json(plain);
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    return res.status(500).json({ message: e.message });
  }
}

async function deleteUser(req, res) {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    if (String(req.user.id) === String(req.params.id)) return res.status(400).json({ message: 'Cannot delete self' });
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Not found' });
    await user.destroy();
    return res.json({ message: 'Deleted' });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

module.exports = { listUsers, getUser, updateUser, createUser, deleteUser };
