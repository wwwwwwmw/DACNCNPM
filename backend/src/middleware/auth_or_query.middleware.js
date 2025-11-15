const jwt = require('jsonwebtoken');

module.exports = function authHeaderOrQueryToken(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  let token = null;
  if (authHeader.startsWith('Bearer ')) token = authHeader.slice(7);
  if (!token && req.query && req.query.token) token = req.query.token;
  if (!token) return res.status(401).json({ message: 'Missing token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwt');
    req.user = payload; // { id, role, departmentId }
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
