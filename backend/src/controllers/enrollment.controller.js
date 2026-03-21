const prisma = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { sendCourseContactEmail, sendCourseInvitationEmail } = require('../utils/mailer');

// ── helpers ──────────────────────────────────────────────────────

/** Verify course access for instructor/admin operations */
const verifyCourseAccess = async (courseId, user) => {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return { error: 'Course not found', status: 404 };
  if (user.role === 'instructor' && course.responsibleId !== user.id) {
    return { error: 'Access forbidden', status: 403 };
  }
  return { course };
};

// ── 1. enrollInCourse ────────────────────────────────────────────

const enrollInCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || !course.isPublished) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (existingEnrollment) {
      return res.json({ success: true, data: { enrollment: existingEnrollment } });
    }

    // Validate access rules
    if (course.accessRule === 'invitation') {
      const invitation = await prisma.courseInvitation.findUnique({
        where: { courseId_email: { courseId, email: req.user.email } },
      });

      if (!invitation || invitation.status !== 'accepted') {
        return res.status(403).json({ success: false, message: 'Invitation required' });
      }
    } else if (course.accessRule === 'payment') {
      const verifiedPayment = await prisma.payment.findFirst({
        where: {
          userId,
          courseId,
          status: 'verified',
        },
        orderBy: { paidAt: 'desc' },
      });

      if (!verifiedPayment) {
        return res.status(402).json({
          success: false,
          message: 'Payment required',
          code: 'PAYMENT_REQUIRED',
        });
      }
    }

    // Enroll the user
    const enrollment = await prisma.enrollment.create({
      data: {
        userId,
        courseId,
        status: 'not_started',
        isPaid: course.accessRule === 'payment',
        paidAt: course.accessRule === 'payment' ? new Date() : null,
        amountPaid: course.accessRule === 'payment' ? course.price : null,
      },
    });

    return res.status(201).json({ success: true, data: { enrollment } });
  } catch (err) {
    next(err);
  }
};

// ── 2. getMyEnrollments ──────────────────────────────────────────

const getMyEnrollments = async (req, res, next) => {
  try {
    // In PostgreSQL, to get progress stats efficiently we do a complex query.
    // Since we don't have a vw_course_progress view yet in Prisma, we'll
    // construct it via $queryRaw to mimic the requested SELECT * FROM vw_course_progress.
    // For simplicity with Prisma types, we'll fetch the enrollments + nested course
    // and aggregate lesson progress via Prisma OR we can run raw SQL. Let's run a robust Raw SQL.

    const userId = req.user.id;

    // We'll calculate progress manually or via DB. For now, let's use Prisma to fetch relations
    // and compute progress locally.
    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            title: true,
            coverImageUrl: true,
            tags: true,
            shortDesc: true,
            accessRule: true,
            price: true,
            lessons: { select: { id: true } },
          },
        },
        lessonProgress: true,
      },
      orderBy: { enrolledAt: 'desc' },
    });

    const data = enrollments.map((e) => {
      const { course, lessonProgress, ...enrollmentData } = e;
      const totalLessons = course.lessons.length;
      const completedLessons = lessonProgress.filter((lp) => lp.isCompleted).length;
      const completionPct =
        totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      return {
        ...enrollmentData,
        title: course.title,
        coverImageUrl: course.coverImageUrl,
        tags: course.tags,
        shortDesc: course.shortDesc,
        accessRule: course.accessRule,
        price: course.price,
        completion_pct: completionPct,
        totalLessons,
        completedLessons,
      };
    });

    return res.json({ success: true, data: { enrollments: data } });
  } catch (err) {
    next(err);
  }
};

// ── 3. getEnrollmentById ─────────────────────────────────────────

const getEnrollmentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        course: { select: { responsibleId: true } },
        lessonProgress: true,
        _count: { select: { quizAttempts: true } },
      },
    });

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    // Access control: learner (own) or instructor(own) or admin
    if (req.user.role === 'learner' && enrollment.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access forbidden' });
    }
    if (req.user.role === 'instructor' && enrollment.course.responsibleId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access forbidden' });
    }

    const { _count, course, ...data } = enrollment;
    data.quizAttemptCount = _count.quizAttempts;

    return res.json({ success: true, data: { enrollment: data } });
  } catch (err) {
    next(err);
  }
};

// ── 4. addAttendees ──────────────────────────────────────────────

const addAttendees = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { emails } = req.body;

    const access = await verifyCourseAccess(courseId, req.user);
    if (access.error) {
      return res.status(access.status).json({ success: false, message: access.error });
    }

    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ success: false, message: 'emails array required' });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { title: true },
    });
    const inviter = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { name: true },
    });
    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    let invited = 0;
    let alreadyEnrolled = 0;
    const inviteLinks = [];
    let emailsSent = 0;
    const emailFailures = [];

    // Expire invitations in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    for (const email of emails) {
      const lowerEmail = email.toLowerCase().trim();

      // Check if already invited OR enrolled
      const existingInvitation = await prisma.courseInvitation.findUnique({
        where: { courseId_email: { courseId, email: lowerEmail } },
      });

      if (existingInvitation) {
        alreadyEnrolled++;
        continue;
      }

      // See if user exists
      const user = await prisma.user.findUnique({ where: { email: lowerEmail } });

      const token = uuidv4();
      const inviteUrl = `${frontendBaseUrl}/invitations/${token}`;

      await prisma.$transaction(async (tx) => {
        const inv = await tx.courseInvitation.create({
          data: {
            courseId,
            email: lowerEmail,
            invitedBy: req.user.id,
            token,
            expiresAt,
            status: user ? 'accepted' : 'pending',
            userId: user ? user.id : null,
            acceptedAt: user ? new Date() : null,
          },
        });

        if (user) {
          // Auto enroll if user exists
          const exists = await tx.enrollment.findUnique({
            where: { userId_courseId: { userId: user.id, courseId } },
          });

          if (!exists) {
            await tx.enrollment.create({
              data: {
                userId: user.id,
                courseId,
                status: 'not_started',
              },
            });
          }
        }

        invited++;
        inviteLinks.push({ email: lowerEmail, token, status: inv.status, inviteUrl });
      });

      try {
        await sendCourseInvitationEmail({
          to: lowerEmail,
          learnerName: user?.name || null,
          courseTitle: course?.title || 'your course',
          inviterName: inviter?.name || req.user.email,
          inviteUrl,
        });
        emailsSent++;
      } catch (mailErr) {
        emailFailures.push({ email: lowerEmail, reason: mailErr.message });
      }
    }

    return res.json({
      success: true,
      data: { invited, alreadyEnrolled, inviteLinks, emailsSent, emailFailures },
    });
  } catch (err) {
    next(err);
  }
};

// ── 5. getAttendees ──────────────────────────────────────────────

const getAttendees = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const access = await verifyCourseAccess(courseId, req.user);
    if (access.error) {
      return res.status(access.status).json({ success: false, message: access.error });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { courseId },
      include: {
        user: { select: { name: true, email: true, avatarUrl: true } },
        course: { select: { lessons: { select: { id: true } } } },
        lessonProgress: true,
      },
      orderBy: { enrolledAt: 'desc' },
    });

    const data = enrollments.map((e) => {
      const totalLessons = e.course.lessons.length;
      const completedLessons = e.lessonProgress.filter((lp) => lp.isCompleted).length;
      const completionPct =
        totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      return {
        name: e.user.name,
        email: e.user.email,
        avatar_url: e.user.avatarUrl,
        status: e.status,
        enrolled_at: e.enrolledAt,
        time_spent_mins: e.timeSpentMins,
        completion_pct: completionPct,
      };
    });

    return res.json({ success: true, data: { attendees: data } });
  } catch (err) {
    next(err);
  }
};

const contactAttendees = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { subject, message } = req.body;

    const access = await verifyCourseAccess(courseId, req.user);
    if (access.error) {
      return res.status(access.status).json({ success: false, message: access.error });
    }

    if (!subject?.trim() || !message?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'subject and message are required',
      });
    }

    const [course, sender, attendees] = await Promise.all([
      prisma.course.findUnique({
        where: { id: courseId },
        select: { title: true },
      }),
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: { name: true, email: true },
      }),
      prisma.enrollment.findMany({
        where: { courseId },
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      }),
    ]);

    if (attendees.length === 0) {
      return res.json({
        success: true,
        data: { sent: 0, failed: 0, failures: [] },
      });
    }

    let sent = 0;
    const failures = [];

    for (const attendee of attendees) {
      try {
        await sendCourseContactEmail({
          to: attendee.user.email,
          learnerName: attendee.user.name,
          courseTitle: course?.title || 'your course',
          senderName: sender?.name || sender?.email || 'Course admin',
          subject: subject.trim(),
          message: message.trim(),
        });
        sent++;
      } catch (mailErr) {
        failures.push({
          email: attendee.user.email,
          reason: mailErr.message,
        });
      }
    }

    return res.json({
      success: true,
      data: {
        sent,
        failed: failures.length,
        failures,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── 6. acceptInvitation ──────────────────────────────────────────

const acceptInvitation = async (req, res, next) => {
  try {
    const { token } = req.params;
    const userId = req.user.id;

    // Find valid invitation
    const invitation = await prisma.courseInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invitation not found' });
    }

    if (invitation.expiresAt < new Date()) {
      return res.status(410).json({ success: false, message: 'Invitation expired' });
    }

    if (invitation.status === 'accepted') {
      return res.status(400).json({ success: false, message: 'Invitation already accepted' });
    }

    if (invitation.email !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: 'This invitation is for a different email address',
      });
    }

    // Transaction: mark accepted + enroll
    const enrollment = await prisma.$transaction(async (tx) => {
      await tx.courseInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'accepted',
          acceptedAt: new Date(),
          userId,
        },
      });

      // Insert enrollment if not exists
      let enr = await tx.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: invitation.courseId } },
      });

      if (!enr) {
        enr = await tx.enrollment.create({
          data: {
            userId,
            courseId: invitation.courseId,
            status: 'not_started',
          },
        });
      }

      return enr;
    });

    return res.json({ success: true, data: { enrollment } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  enrollInCourse,
  getMyEnrollments,
  getEnrollmentById,
  addAttendees,
  getAttendees,
  contactAttendees,
  acceptInvitation,
};
