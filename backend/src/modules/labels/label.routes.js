const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth.middleware');
const { listLabels, createLabel, updateLabel, deleteLabel } = require('./label.controller');

router.use(auth);
router.get('/', listLabels);
router.post('/', createLabel);
router.put('/:id', updateLabel);
router.delete('/:id', deleteLabel);

module.exports = router;
