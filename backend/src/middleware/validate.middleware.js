const { validationResult } = require('express-validator');

function validate(rules = []) {
  return [
    ...rules,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      }
      next();
    }
  ];
}

module.exports = { validate };
