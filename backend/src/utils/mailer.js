const nodemailer = require('nodemailer');

let transporterPromise;

const createTransporter = async () => {
  if (transporterPromise) {
    return transporterPromise;
  }

  transporterPromise = (async () => {
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_SECURE,
      SMTP_USER,
      SMTP_PASS,
    } = process.env;

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
      throw new Error(
        'SMTP configuration is missing. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.'
      );
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: String(SMTP_SECURE).toLowerCase() === 'true',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    return transporter;
  })();

  return transporterPromise;
};

const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const transporter = await createTransporter();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const appName = process.env.APP_NAME || 'Learnova';

  await transporter.sendMail({
    from,
    to,
    subject: `Reset your ${appName} password`,
    text: [
      `Hi ${name || 'there'},`,
      '',
      'We received a request to reset your password.',
      `Use this link to set a new password: ${resetUrl}`,
      '',
      'This link will expire in 1 hour.',
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <p>Hi ${name || 'there'},</p>
        <p>We received a request to reset your password.</p>
        <p>
          <a
            href="${resetUrl}"
            style="display: inline-block; padding: 12px 18px; background: #2D31D4; color: #ffffff; text-decoration: none; border-radius: 8px;"
          >
            Reset Password
          </a>
        </p>
        <p>If the button does not work, copy and paste this URL into your browser:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });
};

const sendCourseInvitationEmail = async ({
  to,
  learnerName,
  courseTitle,
  inviterName,
  inviteUrl,
}) => {
  const transporter = await createTransporter();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const appName = process.env.APP_NAME || 'Learnova';

  await transporter.sendMail({
    from,
    to,
    subject: `You're invited to join ${courseTitle} on ${appName}`,
    text: [
      `Hi ${learnerName || 'there'},`,
      '',
      `${inviterName || 'A course admin'} invited you to join "${courseTitle}".`,
      `Accept your invitation here: ${inviteUrl}`,
      '',
      'If you were not expecting this email, you can ignore it.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <p>Hi ${learnerName || 'there'},</p>
        <p>${inviterName || 'A course admin'} invited you to join <strong>${courseTitle}</strong>.</p>
        <p>
          <a
            href="${inviteUrl}"
            style="display: inline-block; padding: 12px 18px; background: #2D31D4; color: #ffffff; text-decoration: none; border-radius: 8px;"
          >
            Accept Invitation
          </a>
        </p>
        <p>If the button does not work, copy and paste this URL into your browser:</p>
        <p><a href="${inviteUrl}">${inviteUrl}</a></p>
        <p>If you were not expecting this email, you can ignore it.</p>
      </div>
    `,
  });
};

const sendCourseContactEmail = async ({
  to,
  learnerName,
  courseTitle,
  senderName,
  subject,
  message,
}) => {
  const transporter = await createTransporter();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    to,
    subject,
    text: [
      `Hi ${learnerName || 'there'},`,
      '',
      `Message about "${courseTitle}" from ${senderName || 'your course team'}:`,
      '',
      message,
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <p>Hi ${learnerName || 'there'},</p>
        <p>Message about <strong>${courseTitle}</strong> from ${senderName || 'your course team'}:</p>
        <div style="padding: 12px 14px; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; white-space: pre-wrap;">${message}</div>
      </div>
    `,
  });
};

const sendCoursePurchaseEmail = async ({
  to,
  learnerName,
  courseTitle,
  courseUrl,
  amount,
  currency,
}) => {
  const transporter = await createTransporter();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const appName = process.env.APP_NAME || 'Learnova';
  const amountLine =
    typeof amount !== 'undefined' && amount !== null
      ? `${currency || 'INR'} ${Number(amount).toFixed(2)}`
      : null;

  await transporter.sendMail({
    from,
    to,
    subject: `Course purchase confirmed: ${courseTitle}`,
    text: [
      `Hi ${learnerName || 'there'},`,
      '',
      `Your purchase for "${courseTitle}" was successful.`,
      ...(amountLine ? [`Amount paid: ${amountLine}`] : []),
      ...(courseUrl ? [`Start learning here: ${courseUrl}`] : []),
      '',
      `Thank you for learning with ${appName}.`,
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <p>Hi ${learnerName || 'there'},</p>
        <p>Your purchase for <strong>${courseTitle}</strong> was successful.</p>
        ${
          amountLine
            ? `<p><strong>Amount paid:</strong> ${amountLine}</p>`
            : ''
        }
        ${
          courseUrl
            ? `<p><a href="${courseUrl}" style="display: inline-block; padding: 12px 18px; background: #2D31D4; color: #ffffff; text-decoration: none; border-radius: 8px;">Open Course</a></p>
               <p>If the button does not work, copy and paste this URL into your browser:</p>
               <p><a href="${courseUrl}">${courseUrl}</a></p>`
            : ''
        }
        <p>Thank you for learning with ${appName}.</p>
      </div>
    `,
  });
};

module.exports = {
  sendPasswordResetEmail,
  sendCourseInvitationEmail,
  sendCourseContactEmail,
  sendCoursePurchaseEmail,
};
