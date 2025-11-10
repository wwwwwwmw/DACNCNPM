const bcrypt = require('bcryptjs');
const { User, Department } = require('../../models');
const { signUser } = require('../../utils/jwt');
const { sendMail } = require('../../utils/email');
const jwt = require('jsonwebtoken');

async function register(req, res) {
  try {
    const { name, email, password, role, departmentId } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Missing required fields' });
    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(409).json({ message: 'Email already in use' });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash, role: role || 'employee', departmentId: departmentId || null });
    const token = signUser(user);
    return res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, departmentId: user.departmentId } });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const token = signUser(user);
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, departmentId: user.departmentId } });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'supersecretjwt', { expiresIn: '15m' });
    const resetLink = `http://localhost:${process.env.PORT || 5000}/api/auth/reset-password?token=${resetToken}`;
    await sendMail({ to: user.email, subject: 'Reset your password', text: `Reset link: ${resetLink}` });
    return res.json({ message: 'Reset link sent to email (dev: see console output)' });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ message: 'Missing token or newPassword' });
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwt');
    const user = await User.findByPk(payload.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const hash = await bcrypt.hash(newPassword, 10);
    user.password = hash;
    await user.save();
    return res.json({ message: 'Password updated' });
  } catch (e) {
    return res.status(400).json({ message: 'Invalid or expired token' });
  }
}

module.exports = { register, login, forgotPassword, resetPassword };
