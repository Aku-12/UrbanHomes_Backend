const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validateMiddleware');
const {
  contactSchema,
  updateContactStatusSchema
} = require('../validators/contactValidators');

// Public routes
router.post('/', validate(contactSchema), contactController.submitContact);

// Admin only routes
router.get('/', protect, authorize('admin'), contactController.getContacts);
router.get('/:id', protect, authorize('admin'), contactController.getContact);
router.put('/:id/status', protect, authorize('admin'), validate(updateContactStatusSchema), contactController.updateContactStatus);
router.delete('/:id', protect, authorize('admin'), contactController.deleteContact);

module.exports = router;