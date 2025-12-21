const { ZodError } = require('zod');

const validate = (schema) => {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated; // Replace with validated/transformed data
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

module.exports = { validate };
