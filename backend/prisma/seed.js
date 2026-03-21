const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

const PDFS = [
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  'https://www.africau.edu/images/default/sample.pdf',
  'https://www.orimi.com/pdf-test.pdf',
];

const IMAGES = [
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?q=80&w=1200&auto=format&fit=crop',
];

const VIDEO = {
  react: 'https://www.youtube.com/watch?v=dGcsHMXbSOA',
  next: 'https://www.youtube.com/watch?v=wm5gMKuwSYk',
  tailwind: 'https://www.youtube.com/watch?v=lCxcTsOHrjo',
  javascript: 'https://www.youtube.com/watch?v=PkZNo7MFNFg',
  typescript: 'https://www.youtube.com/watch?v=30LWjhZzg50',
  htmlcss: 'https://www.youtube.com/watch?v=mU6anWqZJcc',
  figma: 'https://www.youtube.com/watch?v=FTFaQWZBqQ8',
  node: 'https://www.youtube.com/watch?v=Oe421EPjeBE',
  prisma: 'https://www.youtube.com/watch?v=RebA5J-rlwg',
  auth: 'https://www.youtube.com/watch?v=mbsmsi7l3r4',
  graphql: 'https://www.youtube.com/watch?v=5199E50O7SI',
  docker: 'https://www.youtube.com/watch?v=fqMOX6JJhGo',
  kubernetes: 'https://www.youtube.com/watch?v=X48VuDVv0do',
  git: 'https://www.youtube.com/watch?v=RGOj5yH7evk',
  linux: 'https://www.youtube.com/watch?v=IVquJh3DXUA',
  python: 'https://www.youtube.com/watch?v=rfscVS0vtbw',
  sql: 'https://www.youtube.com/watch?v=HXV3zeQKqGY',
  java: 'https://www.youtube.com/watch?v=A74TOX803D0',
  spring: 'https://www.youtube.com/watch?v=35EQXmHKZYs',
  dsa: 'https://www.youtube.com/watch?v=8hly31xKli0',
  system: 'https://www.youtube.com/watch?v=bUHFg8CZFws',
  postman: 'https://www.youtube.com/watch?v=VywxIQ2ZXw4',
  actions: 'https://www.youtube.com/watch?v=R8_veQiYBjI',
  mongodb: 'https://www.youtube.com/watch?v=c2M-rlkkT5o',
  redis: 'https://www.youtube.com/watch?v=jgpVdJB2sKQ',
  native: 'https://www.youtube.com/watch?v=0-S5a0eXPoc',
  ml: 'https://www.youtube.com/watch?v=i_LwzRVP7bg',
  career: 'https://www.youtube.com/watch?v=1mHjMNZZvFo',
  testing: 'https://www.youtube.com/watch?v=8Xwq35cPwYg',
};

const COURSES = [
  ['seed-react-performance-patterns', 'React Performance Patterns', ['React', 'Frontend', 'Performance'], VIDEO.react, 'payment', 'everyone', 899, 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=1200&auto=format&fit=crop'],
  ['seed-react-state-architecture', 'React State Architecture', ['React', 'State', 'Architecture'], VIDEO.react, 'open', 'everyone', 0, 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop'],
  ['seed-nextjs-app-router', 'Next.js App Router in Practice', ['Next.js', 'React', 'Fullstack'], VIDEO.next, 'payment', 'signed_in', 1099, 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200&auto=format&fit=crop'],
  ['seed-tailwind-component-systems', 'Tailwind Component Systems', ['Tailwind', 'CSS', 'Design'], VIDEO.tailwind, 'open', 'everyone', 0, 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop'],
  ['seed-javascript-foundations', 'JavaScript Foundations for Builders', ['JavaScript', 'Frontend', 'Programming'], VIDEO.javascript, 'open', 'everyone', 0, 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=1200&auto=format&fit=crop'],
  ['seed-typescript-team-toolkit', 'TypeScript Team Toolkit', ['TypeScript', 'Frontend', 'Backend'], VIDEO.typescript, 'open', 'signed_in', 0, 'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?q=80&w=1200&auto=format&fit=crop'],
  ['seed-html-css-foundations', 'HTML & CSS Foundations', ['HTML', 'CSS', 'Frontend'], VIDEO.htmlcss, 'open', 'everyone', 0, 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?q=80&w=1200&auto=format&fit=crop'],
  ['seed-ui-ux-for-developers', 'UI/UX for Developers', ['UI/UX', 'Design', 'Frontend'], VIDEO.figma, 'payment', 'signed_in', 799, 'https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=1200&auto=format&fit=crop'],
  ['seed-node-express-apis', 'Node.js REST APIs with Express', ['Node.js', 'Express', 'API'], VIDEO.node, 'open', 'everyone', 0, 'https://images.unsplash.com/photo-1627398225056-ee18c89fb90d?q=80&w=1200&auto=format&fit=crop'],
  ['seed-prisma-postgresql-practice', 'Prisma & PostgreSQL in Practice', ['Prisma', 'PostgreSQL', 'Backend'], VIDEO.prisma, 'payment', 'everyone', 999, 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?q=80&w=1200&auto=format&fit=crop'],
  ['seed-auth-security-jwt', 'Auth & Security for Web Apps', ['Authentication', 'Security', 'JWT'], VIDEO.auth, 'invitation', 'signed_in', 0, 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?q=80&w=1200&auto=format&fit=crop'],
  ['seed-graphql-fullstack-apis', 'GraphQL Fullstack APIs', ['GraphQL', 'API', 'Fullstack'], VIDEO.graphql, 'payment', 'signed_in', 849, 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=1200&auto=format&fit=crop'],
  ['seed-docker-developer-workflows', 'Docker Developer Workflows', ['Docker', 'DevOps', 'Infra'], VIDEO.docker, 'payment', 'everyone', 699, 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?q=80&w=1200&auto=format&fit=crop'],
  ['seed-kubernetes-deployment-basics', 'Kubernetes Deployment Basics', ['Kubernetes', 'DevOps', 'Cloud'], VIDEO.kubernetes, 'invitation', 'signed_in', 0, 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?q=80&w=1200&auto=format&fit=crop'],
  ['seed-git-github-collaboration', 'Git & GitHub Collaboration', ['Git', 'GitHub', 'Collaboration'], VIDEO.git, 'open', 'everyone', 0, 'https://images.unsplash.com/photo-1556075798-4825dfaaf498?q=80&w=1200&auto=format&fit=crop'],
  ['seed-linux-command-line', 'Linux Command Line for Developers', ['Linux', 'CLI', 'Tools'], VIDEO.linux, 'open', 'signed_in', 0, 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop'],
  ['seed-python-automation', 'Python for Automation', ['Python', 'Automation', 'Programming'], VIDEO.python, 'open', 'everyone', 0, 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?q=80&w=1200&auto=format&fit=crop'],
  ['seed-sql-for-app-builders', 'SQL for App Builders', ['SQL', 'Database', 'Backend'], VIDEO.sql, 'payment', 'everyone', 749, 'https://images.unsplash.com/photo-1542903660-eedba2cda473?q=80&w=1200&auto=format&fit=crop'],
  ['seed-java-fundamentals', 'Java Fundamentals', ['Java', 'Programming', 'OOP'], VIDEO.java, 'open', 'everyone', 0, 'https://images.unsplash.com/photo-1516321310764-8d39b0b1b15d?q=80&w=1200&auto=format&fit=crop'],
  ['seed-spring-boot-services', 'Spring Boot Service Development', ['Spring Boot', 'Java', 'Backend'], VIDEO.spring, 'payment', 'signed_in', 1199, 'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?q=80&w=1200&auto=format&fit=crop'],
  ['seed-data-structures-interviews', 'Data Structures for Interviews', ['DSA', 'Interviews', 'Algorithms'], VIDEO.dsa, 'invitation', 'signed_in', 0, 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1200&auto=format&fit=crop'],
  ['seed-system-design-basics', 'System Design Basics', ['System Design', 'Architecture', 'Backend'], VIDEO.system, 'invitation', 'signed_in', 0, 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop'],
  ['seed-postman-api-testing', 'API Testing with Postman', ['Postman', 'Testing', 'API'], VIDEO.postman, 'open', 'everyone', 0, 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=1200&auto=format&fit=crop'],
  ['seed-github-actions-cicd', 'GitHub Actions CI/CD', ['GitHub Actions', 'CI/CD', 'DevOps'], VIDEO.actions, 'payment', 'signed_in', 899, 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?q=80&w=1200&auto=format&fit=crop'],
  ['seed-mongodb-modern-apps', 'MongoDB for Modern Apps', ['MongoDB', 'Database', 'Backend'], VIDEO.mongodb, 'open', 'everyone', 0, 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=1200&auto=format&fit=crop'],
  ['seed-redis-performance-patterns', 'Redis Performance Patterns', ['Redis', 'Caching', 'Backend'], VIDEO.redis, 'payment', 'signed_in', 699, 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop'],
  ['seed-figma-for-developers', 'Figma for Developers', ['Figma', 'Design', 'Frontend'], VIDEO.figma, 'open', 'signed_in', 0, 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?q=80&w=1200&auto=format&fit=crop'],
  ['seed-react-native-mobile-start', 'React Native Mobile Start', ['React Native', 'Mobile', 'React'], VIDEO.native, 'payment', 'everyone', 999, 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=1200&auto=format&fit=crop'],
  ['seed-ml-python-intro', 'Machine Learning with Python Intro', ['Machine Learning', 'Python', 'AI'], VIDEO.ml, 'payment', 'signed_in', 1299, 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?q=80&w=1200&auto=format&fit=crop'],
  ['seed-career-portfolio-interview', 'Developer Portfolio & Interview Prep', ['Career', 'Portfolio', 'Interviews'], VIDEO.career, 'open', 'everyone', 0, 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?q=80&w=1200&auto=format&fit=crop'],
];

const quizQuestions = (title) => [
  ['What is the main goal of this course?', 'Practical skill building', 'Memorizing trivia', 'Avoiding examples', 'Skipping implementation', 0],
  ['Which habit improves learning most?', 'Consistent practice', 'Ignoring exercises', 'Watching only passively', 'Avoiding feedback', 0],
  ['Why add recap quizzes?', 'To reinforce retention', 'To hide the content', 'To replace projects', 'To slow learners down', 0],
].map(([questionText, a, b, c, d, correct], index) => ({
  questionText: `${questionText} (${title})`,
  sortOrder: index,
  options: {
    create: [a, b, c, d].map((optionText, optionIndex) => ({
      optionText,
      isCorrect: optionIndex === correct,
      sortOrder: optionIndex,
    })),
  },
}));

const createUsers = async () => {
  const hashes = {
    admin: await bcrypt.hash('admin123', 12),
    instructor: await bcrypt.hash('instructor123', 12),
    learner: await bcrypt.hash('learner123', 12),
  };

  const admin = await prisma.user.upsert({
    where: { email: 'admin@learnova.com' },
    update: { name: 'Platform Admin', role: 'admin' },
    create: { name: 'Platform Admin', email: 'admin@learnova.com', passwordHash: hashes.admin, role: 'admin' },
  });

  const instructors = [];
  for (const [name, email] of [['Aarav Sharma', 'instructor@learnova.com'], ['Meera Iyer', 'meera@learnova.com'], ['Pranjal Verma', 'pranjal@learnova.com'], ['Kavya Nair', 'kavya@learnova.com']]) {
    instructors.push(await prisma.user.upsert({
      where: { email },
      update: { name, role: 'instructor' },
      create: { name, email, passwordHash: hashes.instructor, role: 'instructor' },
    }));
  }

  const learners = [];
  for (const [name, email] of [['Demo Learner', 'learner@learnova.com'], ['Anshu Patel', 'anshu@example.com'], ['Riya Singh', 'riya@example.com']]) {
    learners.push(await prisma.user.upsert({
      where: { email },
      update: { name, role: 'learner' },
      create: { name, email, passwordHash: hashes.learner, role: 'learner' },
    }));
  }

  return { admin, instructors, learners };
};

const createCourse = async (row, index, instructorId) => {
  const [websiteUrl, title, tags, videoUrl, accessRule, visibility, price, coverImageUrl] = row;
  const course = await prisma.course.create({
    data: {
      title,
      shortDesc: `Hands-on ${tags[0]} course with guided lessons, media, and quizzes.`,
      description: `${title} is a seeded demo course built to populate the catalog with realistic learning content, accurate access rules, and practical lesson flow.`,
      tags,
      websiteUrl,
      coverImageUrl,
      responsibleId: instructorId,
      isPublished: true,
      publishedAt: new Date(Date.now() - index * 86400000),
      visibility,
      accessRule,
      price,
    },
  });

  const lesson3Type = index % 2 === 0 ? 'document' : 'image';
  const baseLessons = [
    ['Introduction to ' + title, 'video', videoUrl, null, 14, false],
    [tags[0] + ' Deep Dive', 'video', videoUrl, null, 22, false],
    [tags[0] + ' Reference Kit', lesson3Type, null, lesson3Type === 'document' ? PDFS[index % PDFS.length] : IMAGES[index % IMAGES.length], null, true],
  ];

  const lessons = [];
  for (const [lessonIndex, [lessonTitle, lessonType, lessonVideo, lessonFile, durationMins, allowDownload]] of baseLessons.entries()) {
    const lesson = await prisma.lesson.create({
      data: {
        courseId: course.id,
        title: lessonTitle,
        description: `Seeded lesson content for ${title}.`,
        lessonType,
        videoUrl: lessonVideo,
        fileUrl: lessonFile,
        durationMins,
        allowDownload,
        sortOrder: lessonIndex,
        responsibleId: instructorId,
      },
    });
    lessons.push(lesson);
    if (lessonType === 'document' || lessonType === 'image') {
      await prisma.lessonAttachment.create({
        data: {
          lessonId: lesson.id,
          attachmentType: 'link',
          label: `${tags[0]} companion resource`,
          url: lessonFile,
          sortOrder: 0,
        },
      });
    }
  }

  if (index % 2 === 0 || accessRule === 'payment') {
    const quizLesson = await prisma.lesson.create({
      data: {
        courseId: course.id,
        title: `${tags[0]} Knowledge Check`,
        description: `Quiz lesson for ${title}.`,
        lessonType: 'quiz',
        sortOrder: 3,
        responsibleId: instructorId,
      },
    });
    lessons.push(quizLesson);
    await prisma.quiz.create({
      data: {
        courseId: course.id,
        lessonId: quizLesson.id,
        title: `${title} Quiz`,
        questions: { create: quizQuestions(title) },
      },
    });
  }

  return { ...course, lessons };
};

const seedCatalog = async ({ instructors }) => {
  await prisma.course.deleteMany({
    where: {
      OR: [
        { websiteUrl: { startsWith: 'seed-' } },
        { websiteUrl: { in: ['advanced-react', 'node-prisma-arch', 'ui-ux-devs', 'intro-devops'] } },
      ],
    },
  });

  const created = [];
  for (const [index, row] of COURSES.entries()) {
    created.push(await createCourse(row, index, instructors[index % instructors.length].id));
  }
  return created;
};

const seedLearnerData = async ({ admin, learners }, courses) => {
  const [demoLearner, anshuLearner, riyaLearner] = learners;
  const invitationCourses = courses.filter((course) => course.accessRule === 'invitation');
  const paymentCourses = courses.filter((course) => course.accessRule === 'payment');
  const openCourses = courses.filter((course) => course.accessRule === 'open');

  for (const [index, course] of invitationCourses.entries()) {
    await prisma.courseInvitation.create({
      data: {
        courseId: course.id,
        invitedBy: admin.id,
        email: demoLearner.email,
        userId: demoLearner.id,
        status: index < 3 ? 'accepted' : 'pending',
        token: crypto.randomUUID(),
        acceptedAt: index < 3 ? new Date() : null,
        expiresAt: new Date(Date.now() + 14 * 86400000),
      },
    });
    await prisma.courseInvitation.create({
      data: {
        courseId: course.id,
        invitedBy: admin.id,
        email: riyaLearner.email,
        userId: riyaLearner.id,
        status: index === 0 ? 'accepted' : 'pending',
        token: crypto.randomUUID(),
        acceptedAt: index === 0 ? new Date() : null,
        expiresAt: new Date(Date.now() + 14 * 86400000),
      },
    });
  }

  const enrollments = [
    [demoLearner, openCourses[0], 'in_progress', false],
    [demoLearner, openCourses[1], 'completed', false],
    [demoLearner, invitationCourses[0], 'in_progress', false],
    [anshuLearner, paymentCourses[0], 'in_progress', true],
    [anshuLearner, paymentCourses[1], 'completed', true],
    [riyaLearner, openCourses[2], 'in_progress', false],
  ].filter((item) => item[1]);

  for (const [index, [learner, course, status, paid]] of enrollments.entries()) {
    const enrolledAt = new Date(Date.now() - (index + 1) * 86400000);
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: learner.id,
        courseId: course.id,
        status,
        enrolledAt,
        startedAt: enrolledAt,
        completedAt: status === 'completed' ? new Date(enrolledAt.getTime() + 3600000) : null,
        timeSpentMins: status === 'completed' ? 95 : 32,
        isPaid: paid,
        paidAt: paid ? enrolledAt : null,
        amountPaid: paid ? course.price : null,
      },
    });

    await prisma.courseLearner.create({
      data: { userId: learner.id, courseId: course.id },
    });

    const completedLessons = status === 'completed' ? course.lessons : course.lessons.slice(0, 1);
    for (const lesson of completedLessons.filter((item) => item.lessonType !== 'quiz')) {
      await prisma.lessonProgress.create({
        data: {
          userId: learner.id,
          lessonId: lesson.id,
          enrollmentId: enrollment.id,
          isCompleted: true,
          completedAt: new Date(enrolledAt.getTime() + 7200000),
        },
      });
    }

    if (paid) {
      await prisma.payment.create({
        data: {
          userId: learner.id,
          courseId: course.id,
          enrollmentId: enrollment.id,
          provider: 'stripe',
          status: 'verified',
          currency: 'INR',
          amount: course.price,
          receipt: `seed_receipt_${index + 1}`,
          providerOrderId: `seed_order_${index + 1}_${course.websiteUrl}`,
          providerPaymentId: `seed_payment_${index + 1}_${course.websiteUrl}`,
          providerPayload: { seeded: true, course: course.websiteUrl },
          paidAt: enrolledAt,
        },
      });
    }
  }

  if (openCourses[0]) {
    await prisma.review.create({
      data: {
        userId: demoLearner.id,
        courseId: openCourses[0].id,
        rating: 5,
        reviewText: 'Structured, useful, and realistic demo content.',
      },
    });
  }
};

async function main() {
  const seededUsers = await createUsers();
  console.log('🌱 Users seeded.');

  const courses = await seedCatalog(seededUsers);
  console.log(`🌱 ${courses.length} courses seeded.`);

  await seedLearnerData(seededUsers, courses);
  console.log('🌱 Invitations, enrollments, payments, reviews, and lesson progress seeded.');

  console.log('✅ Seeding complete!');
  console.log('Admin: admin@learnova.com / admin123');
  console.log('Instructor: instructor@learnova.com / instructor123');
  console.log('Learner: learner@learnova.com / learner123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
