const jwt = require('jsonwebtoken');

// Optional auth: if a valid Bearer token (or token query) is present,
// populate req.user; otherwise continue without failing.
module.exports = function maybeAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || '';
    let token = null;
    if (authHeader.startsWith('Bearer ')) token = authHeader.slice(7);
    if (!token && req.query && req.query.token) token = req.query.token;
    if (token) {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwt');
      req.user = payload; // { id, role, departmentId }
    }
  } catch (_) {
    // ignore invalid/expired token for optional auth
  }
  return next();
};
