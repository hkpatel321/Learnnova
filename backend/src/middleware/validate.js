const { validationResult } = require('express-validator');

/**
 * Middleware that checks the result of express-validator validations.
 * Place this AFTER your validation chain in a route definition.
 *
 * Example:
 *   router.post('/signup', [body('email').isEmail()], validate, controller.signup);
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  next();
};

module.exports = { validate };
