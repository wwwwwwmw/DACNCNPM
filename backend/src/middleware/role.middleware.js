function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
    return next();
  };
}

function selfOrAdmin(paramKey = 'id') {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (req.user.role === 'admin') return next();
    const paramId = req.params[paramKey];
    if (paramId && String(paramId) === String(req.user.id)) return next();
    return res.status(403).json({ message: 'Forbidden' });
  };
}

module.exports = { requireRole, selfOrAdmin };
