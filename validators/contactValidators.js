const { z } = require('zod');

// Phone regex: supports various formats
const phoneSchema = z
  .string()
  .regex(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/, 'Please provide a valid phone number')
  .optional();

// Contact form schema
const contactSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .trim(),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please provide a valid email address')
    .toLowerCase()
    .trim(),
  subject: z
    .string({ required_error: 'Subject is required' })
    .min(5, 'Subject must be at least 5 characters')
    .max(200, 'Subject cannot exceed 200 characters')
    .trim(),
  message: z
    .string({ required_error: 'Message is required' })
    .min(10, 'Message must be at least 10 characters')
    .max(1000, 'Message cannot exceed 1000 characters')
    .trim(),
  phone: phoneSchema
});

// Status update schema for admin
const updateContactStatusSchema = z.object({
  status: z
    .enum(['unread', 'read', 'replied'], {
      errorMap: () => ({ message: 'Status must be unread, read, or replied' })
    })
});

module.exports = {
  contactSchema,
  updateContactStatusSchema
};