const https = require('https');
const prisma = require('../config/db');

const PAYMENT_PROVIDER = 'stripe';
const DEFAULT_CURRENCY = (process.env.STRIPE_CURRENCY || 'INR').toLowerCase();

const getStripeConfig = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';

  if (!secretKey) {
    const error = new Error('Stripe credentials are not configured');
    error.statusCode = 500;
    throw error;
  }

  return {
    secretKey,
    publishableKey,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  };
};

const getPublishedPaidCourse = async (courseId) => {
  const course = await prisma.course.findUnique({ where: { id: courseId } });

  if (!course || !course.isPublished) {
    return { error: 'Course not found', status: 404 };
  }

  if (course.accessRule !== 'payment') {
    return { error: 'This course does not require payment', status: 400 };
  }

  const amount = Number(course.price || 0);
  if (!amount || amount <= 0) {
    return { error: 'This course does not have a valid price', status: 400 };
  }

  return { course, amount };
};

const callStripeApi = async ({ method, path, body, query = [] }) => {
  const { secretKey } = getStripeConfig();
  const search = new URLSearchParams(query);
  const requestPath = search.size > 0 ? `${path}?${search.toString()}` : path;
  const bodyString = body ? body.toString() : null;

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: 'api.stripe.com',
        path: requestPath,
        method,
        headers: {
          Authorization: `Bearer ${secretKey}`,
          ...(bodyString
            ? {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(bodyString),
              }
            : {}),
        },
      },
      (response) => {
        let rawData = '';

        response.on('data', (chunk) => {
          rawData += chunk;
        });

        response.on('end', () => {
          let payload = {};

          try {
            payload = rawData ? JSON.parse(rawData) : {};
          } catch (_error) {
            payload = {};
          }

          if (response.statusCode < 200 || response.statusCode >= 300) {
            const error = new Error(payload?.error?.message || 'Stripe request failed');
            error.statusCode = response.statusCode;
            reject(error);
            return;
          }

          resolve(payload);
        });
      }
    );

    request.on('error', reject);

    if (bodyString) {
      request.write(bodyString);
    }

    request.end();
  });
};

const createStripeCheckoutSession = async ({
  amountInSubunits,
  currency,
  receipt,
  course,
  user,
  successUrl,
  cancelUrl,
}) => {
  const body = new URLSearchParams();
  body.append('mode', 'payment');
  body.append('success_url', successUrl);
  body.append('cancel_url', cancelUrl);
  body.append('customer_email', user.email);
  body.append('metadata[courseId]', course.id);
  body.append('metadata[userId]', user.id);
  body.append('metadata[receipt]', receipt);
  body.append('payment_intent_data[metadata][courseId]', course.id);
  body.append('payment_intent_data[metadata][userId]', user.id);
  body.append('payment_intent_data[metadata][receipt]', receipt);
  body.append('line_items[0][quantity]', '1');
  body.append('line_items[0][price_data][currency]', currency);
  body.append('line_items[0][price_data][unit_amount]', String(amountInSubunits));
  body.append('line_items[0][price_data][product_data][name]', course.title);
  body.append(
    'line_items[0][price_data][product_data][description]',
    course.shortDesc || `Access to ${course.title}`
  );

  return callStripeApi({
    method: 'POST',
    path: '/v1/checkout/sessions',
    body,
  });
};

const getStripeCheckoutSession = async (sessionId) => {
  return callStripeApi({
    method: 'GET',
    path: `/v1/checkout/sessions/${sessionId}`,
    query: [['expand[]', 'payment_intent']],
  });
};

const createOrUpdatePaidEnrollment = async (tx, { userId, courseId, amount }) => {
  const existingEnrollment = await tx.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  if (existingEnrollment) {
    return tx.enrollment.update({
      where: { id: existingEnrollment.id },
      data: {
        isPaid: true,
        paidAt: existingEnrollment.paidAt || new Date(),
        amountPaid: amount,
      },
    });
  }

  return tx.enrollment.create({
    data: {
      userId,
      courseId,
      status: 'not_started',
      isPaid: true,
      paidAt: new Date(),
      amountPaid: amount,
    },
  });
};

const createPaymentOrder = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const lookup = await getPublishedPaidCourse(courseId);
    if (lookup.error) {
      return res.status(lookup.status).json({ success: false, message: lookup.error });
    }

    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (existingEnrollment?.isPaid) {
      return res.json({
        success: true,
        data: {
          alreadyPaid: true,
          enrollment: existingEnrollment,
        },
      });
    }

    const receipt = `ln_${courseId.slice(0, 8)}_${Date.now()}`;
    const amountInSubunits = Math.round(lookup.amount * 100);
    const { publishableKey, frontendUrl } = getStripeConfig();
    const checkoutSession = await createStripeCheckoutSession({
      amountInSubunits,
      currency: DEFAULT_CURRENCY,
      receipt,
      course: lookup.course,
      user: req.user,
      successUrl: `${frontendUrl}/courses/${courseId}?stripe_status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${frontendUrl}/courses/${courseId}?stripe_status=cancelled`,
    });

    const payment = await prisma.payment.create({
      data: {
        userId,
        courseId,
        provider: PAYMENT_PROVIDER,
        status: 'created',
        currency: (checkoutSession.currency || DEFAULT_CURRENCY).toUpperCase(),
        amount: lookup.amount,
        receipt,
        providerOrderId: checkoutSession.id,
        providerPayload: checkoutSession,
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        publishableKey,
        payment,
        checkoutSessionId: checkoutSession.id,
        checkoutUrl: checkoutSession.url,
        course: {
          id: lookup.course.id,
          title: lookup.course.title,
          amount: lookup.amount,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    const stripeSessionId = req.body.session_id || req.body.sessionId;

    if (!stripeSessionId) {
      return res.status(400).json({
        success: false,
        message: 'session_id is required',
      });
    }

    const lookup = await getPublishedPaidCourse(courseId);
    if (lookup.error) {
      return res.status(lookup.status).json({ success: false, message: lookup.error });
    }

    const payment = await prisma.payment.findFirst({
      where: {
        courseId,
        userId,
        providerOrderId: stripeSessionId,
      },
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment session not found' });
    }

    if (payment.status === 'verified' && payment.enrollmentId) {
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: { id: payment.enrollmentId },
      });

      return res.json({
        success: true,
        data: {
          payment,
          enrollment: existingEnrollment,
        },
      });
    }

    const checkoutSession = await getStripeCheckoutSession(stripeSessionId);
    const metadata = checkoutSession?.metadata || {};
    const paymentIntentId =
      typeof checkoutSession?.payment_intent === 'string'
        ? checkoutSession.payment_intent
        : checkoutSession?.payment_intent?.id || null;
    const isValid =
      checkoutSession?.payment_status === 'paid' &&
      checkoutSession?.status === 'complete' &&
      (!metadata.courseId || metadata.courseId === courseId) &&
      (!metadata.userId || metadata.userId === userId);

    if (!isValid) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
          providerPaymentId: paymentIntentId,
          providerPayload: checkoutSession,
          failedAt: new Date(),
        },
      });

      return res.status(400).json({
        success: false,
        message: 'Stripe checkout session is not paid for this learner/course',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const enrollment = await createOrUpdatePaidEnrollment(tx, {
        userId,
        courseId,
        amount: lookup.amount,
      });

      const verifiedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          enrollmentId: enrollment.id,
          status: 'verified',
          providerPaymentId: paymentIntentId,
          providerPayload: checkoutSession,
          paidAt: new Date(),
          failedAt: null,
        },
      });

      return { enrollment, payment: verifiedPayment };
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const getMyPayments = async (req, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      where: {
        userId: req.user.id,
        status: 'verified',
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            websiteUrl: true,
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    return res.json({
      success: true,
      data: { payments },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  getMyPayments,
};
