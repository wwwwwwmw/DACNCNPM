const jwt = require('jsonwebtoken');

function signUser(user, expiresIn = process.env.JWT_EXPIRES_IN || '7d') {
  const payload = {
    id: user.id,
    role: user.role,
    departmentId: user.departmentId || null,
  };
  return jwt.sign(payload, process.env.JWT_SECRET || 'supersecretjwt', { expiresIn });
}

module.exports = { signUser };
