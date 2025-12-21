const { z } = require('zod');

// Password regex: min 8 chars, uppercase, lowercase, number, special char
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[@$!%*?&]/, 'Password must contain at least one special character (@$!%*?&)');

// Phone regex: supports various formats
const phoneSchema = z
  .string()
  .regex(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/, 'Please provide a valid phone number')
  .optional();

// Register schema
const registerSchema = z.object({
  firstName: z
    .string({ required_error: 'First name is required' })
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name cannot exceed 50 characters')
    .trim(),
  lastName: z
    .string({ required_error: 'Last name is required' })
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name cannot exceed 50 characters')
    .trim(),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please provide a valid email address')
    .toLowerCase()
    .trim(),
  password: passwordSchema,
  phone: phoneSchema
});

// Login schema
const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please provide a valid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required')
});

// Forgot password schema
const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please provide a valid email address')
    .toLowerCase()
    .trim()
});

// Verify reset code schema
const verifyResetCodeSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please provide a valid email address')
    .toLowerCase()
    .trim(),
  code: z
    .string({ required_error: 'Verification code is required' })
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d+$/, 'Verification code must contain only numbers')
});

// Reset password schema
const resetPasswordSchema = z.object({
  resetToken: z
    .string({ required_error: 'Reset token is required' })
    .min(1, 'Reset token is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string({ required_error: 'Please confirm your password' })
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

// Change password schema
const changePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: 'Current password is required' })
    .min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string({ required_error: 'Please confirm your password' })
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyResetCodeSchema,
  resetPasswordSchema,
  changePasswordSchema
};
