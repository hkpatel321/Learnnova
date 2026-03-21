require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash('admin123', 12);
  const instructorHash = await bcrypt.hash('instructor123', 12);
  const learnerHash = await bcrypt.hash('learner123', 12);

  // Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@learnova.com' },
    update: {},
    create: {
      name: 'Platform Admin',
      email: 'admin@learnova.com',
      passwordHash: adminHash,
      role: 'admin',
    },
  });

  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@learnova.com' },
    update: {},
    create: {
      name: 'Demo Instructor',
      email: 'instructor@learnova.com',
      passwordHash: instructorHash,
      role: 'instructor',
    },
  });

  const learner = await prisma.user.upsert({
    where: { email: 'learner@learnova.com' },
    update: {},
    create: {
      name: 'Demo Learner',
      email: 'learner@learnova.com',
      passwordHash: learnerHash,
      role: 'learner',
    },
  });

  console.log('🌱 Users seeded.');

  // Courses
  const coursesData = [
    {
      title: 'Advanced React Patterns & Performance',
      description: 'Master React by learning advanced design patterns, rendering optimization techniques, and state management strategies for large scale applications.',
      tags: ['React', 'Frontend', 'Performance'],
      websiteUrl: 'advanced-react',
      price: 49.99,
      visibility: 'everyone',
      accessRule: 'payment',
      isPublished: true,
      responsibleId: instructor.id,
      coverImageUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=1000&auto=format&fit=crop',
      lessons: {
        create: [
          {
            title: 'Welcome to Advanced React',
            description: 'Overview of what we will build and learn in this masterclass.',
            lessonType: 'video',
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            durationMins: 5,
            sortOrder: 0
          },
          {
            title: 'Understanding Render Cycles',
            description: 'A deep dive into how React Reconciliation actually works under the hood.',
            lessonType: 'video',
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            durationMins: 15,
            sortOrder: 1
          },
          {
            title: 'Memoization Cheat Sheet',
            description: 'When and how to use useMemo, useCallback, and React.memo.',
            lessonType: 'document',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            allowDownload: true,
            sortOrder: 2
          }
        ]
      }
    },
    {
      title: 'Fullstack Node.js & Prisma Architecture',
      description: 'Learn how to build scalable, strongly-typed backend services using Express, Prisma ORM, and PostgreSQL.',
      tags: ['Node.js', 'Prisma', 'Backend'],
      websiteUrl: 'node-prisma-arch',
      price: 0,
      visibility: 'everyone',
      accessRule: 'open',
      isPublished: true,
      responsibleId: instructor.id,
      coverImageUrl: 'https://images.unsplash.com/photo-1627398225056-ee18c89fb90d?q=80&w=1000&auto=format&fit=crop',
      lessons: {
        create: [
          {
            title: 'Setting up the Monorepo',
            description: 'Structuring your code for maximum reusability.',
            lessonType: 'video',
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            durationMins: 10,
            sortOrder: 0
          },
          {
            title: 'Database Design basics',
            description: 'Visualizing relational models.',
            lessonType: 'image',
            fileUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?q=80&w=1000&auto=format&fit=crop',
            allowDownload: true,
            sortOrder: 1
          }
        ]
      }
    },
    {
      title: 'UI/UX Design for Developers',
      description: 'A practical approach to making your apps look stunning. Color theory, typography, spacing, and accessibility all tailored for the engineering mind.',
      tags: ['Design', 'UI/UX', 'CSS'],
      websiteUrl: 'ui-ux-devs',
      price: 29.99,
      visibility: 'signed_in',
      accessRule: 'payment',
      isPublished: true,
      responsibleId: instructor.id,
      coverImageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=1000&auto=format&fit=crop',
      lessons: {
        create: [
          {
            title: 'The 8pt Grid System',
            description: 'Why spacing matters and how to consistently apply it.',
            lessonType: 'video',
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            durationMins: 12,
            sortOrder: 0
          }
        ]
      }
    },
    {
      title: 'Draft Course: Introduction to DevOps',
      description: 'Work in progress. Containerization, CI/CD, and serverless deployments.',
      tags: ['DevOps', 'Docker'],
      websiteUrl: 'intro-devops',
      price: 0,
      visibility: 'everyone',
      accessRule: 'open',
      isPublished: false,
      responsibleId: admin.id,
      coverImageUrl: 'https://images.unsplash.com/photo-1618401479427-c8ef9465fbe1?q=80&w=1000&auto=format&fit=crop',
    }
  ];

  for (const courseData of coursesData) {
    // Check if course exists to avoid massive duplication
    const existing = await prisma.course.findFirst({
      where: { websiteUrl: courseData.websiteUrl }
    });

    if (!existing) {
      await prisma.course.create({
        data: courseData
      });
    }
  }

  console.log('🌱 Courses seeded.');

  // Enroll demo learner in the Node.js open course
  const nodeCourse = await prisma.course.findFirst({ where: { websiteUrl: 'node-prisma-arch' }});
  
  if (nodeCourse) {
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: learner.id,
          courseId: nodeCourse.id
        }
      }
    });

    if (!existingEnrollment) {
      await prisma.enrollment.create({
        data: {
          userId: learner.id,
          courseId: nodeCourse.id,
          status: 'in_progress',
          timeSpentMins: 15
        }
      });
      console.log('🌱 Enrollment seeded.');
    }
  }

  console.log('✅ Seeding complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
