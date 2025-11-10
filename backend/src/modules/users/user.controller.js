const bcrypt = require('bcryptjs');
const { User, Department } = require('../../models');

async function listUsers(req, res) {
  try {
    const users = await User.findAll({ attributes: { exclude: ['password'] }, include: [{ model: Department }] });
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
    const { name, departmentId, password } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Not found' });
    if (name) user.name = name;
    if (typeof departmentId !== 'undefined') user.departmentId = departmentId;
    if (password) user.password = await bcrypt.hash(password, 10);
    await user.save();
    const plain = user.toJSON();
    delete plain.password;
    return res.json(plain);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

module.exports = { listUsers, getUser, updateUser };
