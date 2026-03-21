const { Router } = require('express');
const { body } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const paymentController = require('../controllers/payment.controller');

const router = Router();

router.use(authenticate);

router.post(
  '/courses/:courseId/payment/order',
  requireRole('learner'),
  paymentController.createPaymentOrder
);

router.post(
  '/courses/:courseId/payment/verify',
  requireRole('learner'),
  [
    body('session_id')
      .optional()
      .isString()
      .withMessage('session_id must be a string'),
    body('sessionId')
      .optional()
      .isString()
      .withMessage('sessionId must be a string'),
  ],
  validate,
  paymentController.verifyPayment
);

router.get(
  '/payments/me',
  requireRole('learner'),
  paymentController.getMyPayments
);

module.exports = router;
