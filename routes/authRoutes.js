const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validateMiddleware');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyResetCodeSchema,
  resetPasswordSchema,
  changePasswordSchema
} = require('../validators/authValidators');

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/me', protect, authController.getMe);

// Password management routes
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.put('/change-password', protect, validate(changePasswordSchema), authController.changePassword);
router.post('/verify-reset-code', validate(verifyResetCodeSchema), authController.verifyResetCode);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);


module.exports = router;
