const prisma = require('../config/db');
const { getLearnerCourseAccess } = require('../utils/learnerAccess');

const ALLOWED_ACTIVITY_TYPES = new Set([
  'video_watch',
  'quiz_attempt',
  'document_open',
  'document_download',
  'image_view',
  'image_download',
]);

const toDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const buildActivityGrid = (events, days = 365) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));

  const counts = new Map();
  events.forEach((event) => {
    const key = toDateKey(event.eventDate);
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const daysData = [];
  for (let offset = 0; offset < days; offset += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + offset);
    const key = current.toISOString().slice(0, 10);
    daysData.push({
      date: key,
      count: counts.get(key) || 0,
    });
  }

  let currentStreak = 0;
  for (let index = daysData.length - 1; index >= 0; index -= 1) {
    if (daysData[index].count > 0) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  const longestStreak = daysData.reduce(
    (acc, day) => {
      if (day.count > 0) {
        const nextCurrent = acc.current + 1;
        return {
          current: nextCurrent,
          max: Math.max(acc.max, nextCurrent),
        };
      }

      return {
        current: 0,
        max: acc.max,
      };
    },
    { current: 0, max: 0 }
  ).max;

  const activeDays = daysData.filter((day) => day.count > 0).length;
  const totalEvents = daysData.reduce((sum, day) => sum + day.count, 0);

  return {
    days: daysData,
    summary: {
      totalEvents,
      activeDays,
      currentStreak,
      longestStreak,
    },
  };
};

const trackActivity = async (req, res, next) => {
  try {
    const { activityType, courseId = null, lessonId = null, metadata = null } = req.body;
    const userId = req.user.id;

    if (!ALLOWED_ACTIVITY_TYPES.has(activityType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid activity type',
      });
    }

    if (courseId) {
      const access = await getLearnerCourseAccess(prisma, { userId, courseId });
      if (!access.ok) {
        return res.status(access.status).json({
          success: false,
          message: access.message,
          ...(access.code ? { code: access.code } : {}),
        });
      }
    }

    if (lessonId) {
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        select: { id: true, courseId: true },
      });

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found',
        });
      }

      const access = await getLearnerCourseAccess(prisma, {
        userId,
        courseId: courseId || lesson.courseId,
      });
      if (!access.ok) {
        return res.status(access.status).json({
          success: false,
          message: access.message,
          ...(access.code ? { code: access.code } : {}),
        });
      }
    }

    const activity = await prisma.activityEvent.create({
      data: {
        userId,
        courseId,
        lessonId,
        activityType,
        metadata,
      },
    });

    return res.status(201).json({
      success: true,
      data: { activity },
    });
  } catch (err) {
    next(err);
  }
};

const getMyActivityHeatmap = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const days = 365;
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - (days - 1));

    const events = await prisma.activityEvent.findMany({
      where: {
        userId,
        eventDate: {
          gte: startDate,
        },
      },
      select: {
        eventDate: true,
      },
      orderBy: {
        eventDate: 'asc',
      },
    });

    const grid = buildActivityGrid(events, days);

    return res.json({
      success: true,
      data: grid,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  trackActivity,
  getMyActivityHeatmap,
};
