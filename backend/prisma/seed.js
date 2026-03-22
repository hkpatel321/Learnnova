const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

const DAY_MS = 24 * 60 * 60 * 1000;

const PDFS = [
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  'https://www.africau.edu/images/default/sample.pdf',
  'https://www.orimi.com/pdf-test.pdf',
];

const IMAGE_RESOURCES = [
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?q=80&w=1200&auto=format&fit=crop',
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

const COURSE_THEMES = [
  {
    slug: 'react-performance',
    title: 'React Performance Patterns',
    shortDesc: 'Speed up component trees, tame rerenders, and ship responsive interfaces.',
    tags: ['React', 'Frontend', 'Performance'],
    focus: 'performance tuning for React interfaces',
    videos: [VIDEO.react, VIDEO.typescript, VIDEO.testing],
    coverImageUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'react-state',
    title: 'React State Architecture',
    shortDesc: 'Model state deliberately with scalable patterns for product teams.',
    tags: ['React', 'State', 'Architecture'],
    focus: 'state modeling and predictable UI architecture',
    videos: [VIDEO.react, VIDEO.javascript, VIDEO.typescript],
    coverImageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'next-app-router',
    title: 'Next.js App Router',
    shortDesc: 'Build modern React applications with routing, data loading, and deployment patterns.',
    tags: ['Next.js', 'React', 'Fullstack'],
    focus: 'modern Next.js application structure',
    videos: [VIDEO.next, VIDEO.react, VIDEO.node],
    coverImageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'tailwind-systems',
    title: 'Tailwind Component Systems',
    shortDesc: 'Create reusable design primitives and polished UI systems with Tailwind CSS.',
    tags: ['Tailwind', 'CSS', 'Design'],
    focus: 'component-driven UI system design',
    videos: [VIDEO.tailwind, VIDEO.htmlcss, VIDEO.figma],
    coverImageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'javascript-foundations',
    title: 'JavaScript Foundations',
    shortDesc: 'Strengthen core language fundamentals for browser and server development.',
    tags: ['JavaScript', 'Frontend', 'Programming'],
    focus: 'practical JavaScript fluency',
    videos: [VIDEO.javascript, VIDEO.node, VIDEO.testing],
    coverImageUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'typescript-toolkit',
    title: 'TypeScript Team Toolkit',
    shortDesc: 'Adopt TypeScript patterns that improve collaboration, confidence, and maintainability.',
    tags: ['TypeScript', 'Frontend', 'Backend'],
    focus: 'type-safe collaboration across teams',
    videos: [VIDEO.typescript, VIDEO.react, VIDEO.node],
    coverImageUrl: 'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'html-css-foundations',
    title: 'HTML and CSS Foundations',
    shortDesc: 'Build accessible, responsive pages with modern layout techniques.',
    tags: ['HTML', 'CSS', 'Frontend'],
    focus: 'responsive layout and semantic markup',
    videos: [VIDEO.htmlcss, VIDEO.tailwind, VIDEO.javascript],
    coverImageUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'ui-ux-developers',
    title: 'UI and UX for Developers',
    shortDesc: 'Bridge product thinking with implementation details that improve user experience.',
    tags: ['UI/UX', 'Design', 'Frontend'],
    focus: 'practical UX execution for engineers',
    videos: [VIDEO.figma, VIDEO.tailwind, VIDEO.react],
    coverImageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'node-express-apis',
    title: 'Node.js REST APIs',
    shortDesc: 'Design maintainable backend APIs with routing, validation, and integrations.',
    tags: ['Node.js', 'Express', 'API'],
    focus: 'backend API design with Node and Express',
    videos: [VIDEO.node, VIDEO.postman, VIDEO.auth],
    coverImageUrl: 'https://images.unsplash.com/photo-1627398225056-ee18c89fb90d?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'prisma-postgresql',
    title: 'Prisma and PostgreSQL',
    shortDesc: 'Model relational data cleanly and ship productive backend workflows.',
    tags: ['Prisma', 'PostgreSQL', 'Backend'],
    focus: 'database-backed feature delivery with Prisma',
    videos: [VIDEO.prisma, VIDEO.sql, VIDEO.node],
    coverImageUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'auth-security',
    title: 'Auth and Security for Web Apps',
    shortDesc: 'Implement trustworthy authentication, authorization, and session flows.',
    tags: ['Authentication', 'Security', 'JWT'],
    focus: 'secure authentication flows for modern apps',
    videos: [VIDEO.auth, VIDEO.node, VIDEO.testing],
    coverImageUrl: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'graphql-apis',
    title: 'GraphQL Fullstack APIs',
    shortDesc: 'Move from schema design to production-ready GraphQL use cases.',
    tags: ['GraphQL', 'API', 'Fullstack'],
    focus: 'GraphQL schema and resolver implementation',
    videos: [VIDEO.graphql, VIDEO.node, VIDEO.react],
    coverImageUrl: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'docker-workflows',
    title: 'Docker Developer Workflows',
    shortDesc: 'Containerize applications and simplify local-to-production consistency.',
    tags: ['Docker', 'DevOps', 'Infra'],
    focus: 'container-based development workflows',
    videos: [VIDEO.docker, VIDEO.node, VIDEO.kubernetes],
    coverImageUrl: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'kubernetes-basics',
    title: 'Kubernetes Deployment Basics',
    shortDesc: 'Understand pods, services, and rollout strategies for modern deployments.',
    tags: ['Kubernetes', 'DevOps', 'Cloud'],
    focus: 'deployment orchestration with Kubernetes',
    videos: [VIDEO.kubernetes, VIDEO.docker, VIDEO.actions],
    coverImageUrl: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'git-collaboration',
    title: 'Git and GitHub Collaboration',
    shortDesc: 'Ship changes confidently with branching, pull requests, and code review habits.',
    tags: ['Git', 'GitHub', 'Collaboration'],
    focus: 'healthy team collaboration with Git',
    videos: [VIDEO.git, VIDEO.actions, VIDEO.career],
    coverImageUrl: 'https://images.unsplash.com/photo-1556075798-4825dfaaf498?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'linux-cli',
    title: 'Linux Command Line',
    shortDesc: 'Use the terminal effectively for automation, debugging, and everyday engineering tasks.',
    tags: ['Linux', 'CLI', 'Tools'],
    focus: 'terminal fluency for daily engineering work',
    videos: [VIDEO.linux, VIDEO.git, VIDEO.python],
    coverImageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'python-automation',
    title: 'Python for Automation',
    shortDesc: 'Automate repetitive work with scripts, data parsing, and integrations.',
    tags: ['Python', 'Automation', 'Programming'],
    focus: 'automation scripting with Python',
    videos: [VIDEO.python, VIDEO.testing, VIDEO.sql],
    coverImageUrl: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'sql-builders',
    title: 'SQL for App Builders',
    shortDesc: 'Write useful queries and reason about data models in production systems.',
    tags: ['SQL', 'Database', 'Backend'],
    focus: 'practical SQL for application teams',
    videos: [VIDEO.sql, VIDEO.prisma, VIDEO.mongodb],
    coverImageUrl: 'https://images.unsplash.com/photo-1542903660-eedba2cda473?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'java-fundamentals',
    title: 'Java Fundamentals',
    shortDesc: 'Learn object-oriented programming patterns and core Java application structure.',
    tags: ['Java', 'Programming', 'OOP'],
    focus: 'core Java development skills',
    videos: [VIDEO.java, VIDEO.spring, VIDEO.dsa],
    coverImageUrl: 'https://images.unsplash.com/photo-1516321310764-8d39b0b1b15d?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'spring-services',
    title: 'Spring Boot Service Development',
    shortDesc: 'Build backend services with dependency injection, APIs, and production patterns.',
    tags: ['Spring Boot', 'Java', 'Backend'],
    focus: 'service-oriented backend development in Spring',
    videos: [VIDEO.spring, VIDEO.java, VIDEO.sql],
    coverImageUrl: 'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'dsa-interviews',
    title: 'Data Structures for Interviews',
    shortDesc: 'Practice the core algorithmic patterns used in technical interviews.',
    tags: ['DSA', 'Interviews', 'Algorithms'],
    focus: 'interview-oriented algorithm practice',
    videos: [VIDEO.dsa, VIDEO.java, VIDEO.python],
    coverImageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'system-design',
    title: 'System Design Basics',
    shortDesc: 'Reason about scale, tradeoffs, and reliability in backend systems.',
    tags: ['System Design', 'Architecture', 'Backend'],
    focus: 'designing scalable backend systems',
    videos: [VIDEO.system, VIDEO.node, VIDEO.redis],
    coverImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'postman-testing',
    title: 'API Testing with Postman',
    shortDesc: 'Create reusable API collections and improve verification across teams.',
    tags: ['Postman', 'Testing', 'API'],
    focus: 'API validation and test workflows',
    videos: [VIDEO.postman, VIDEO.node, VIDEO.testing],
    coverImageUrl: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'github-actions',
    title: 'GitHub Actions CI/CD',
    shortDesc: 'Automate checks, builds, and delivery pipelines with practical workflows.',
    tags: ['GitHub Actions', 'CI/CD', 'DevOps'],
    focus: 'CI/CD workflow automation',
    videos: [VIDEO.actions, VIDEO.git, VIDEO.docker],
    coverImageUrl: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'mongodb-apps',
    title: 'MongoDB for Modern Apps',
    shortDesc: 'Model documents effectively and build flexible data layers.',
    tags: ['MongoDB', 'Database', 'Backend'],
    focus: 'document database design for app teams',
    videos: [VIDEO.mongodb, VIDEO.node, VIDEO.graphql],
    coverImageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'redis-performance',
    title: 'Redis Performance Patterns',
    shortDesc: 'Add caching, queues, and data acceleration to your backend stack.',
    tags: ['Redis', 'Caching', 'Backend'],
    focus: 'cache-backed performance improvements',
    videos: [VIDEO.redis, VIDEO.node, VIDEO.system],
    coverImageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'figma-developers',
    title: 'Figma for Developers',
    shortDesc: 'Translate design specs into engineering-friendly implementation detail.',
    tags: ['Figma', 'Design', 'Frontend'],
    focus: 'hand-off and implementation from design tools',
    videos: [VIDEO.figma, VIDEO.htmlcss, VIDEO.tailwind],
    coverImageUrl: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'react-native',
    title: 'React Native Mobile Start',
    shortDesc: 'Ship mobile UI and navigation flows using the React ecosystem.',
    tags: ['React Native', 'Mobile', 'React'],
    focus: 'shipping mobile experiences with React Native',
    videos: [VIDEO.native, VIDEO.react, VIDEO.typescript],
    coverImageUrl: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'ml-python',
    title: 'Machine Learning with Python',
    shortDesc: 'Explore beginner-friendly ML concepts through practical Python workflows.',
    tags: ['Machine Learning', 'Python', 'AI'],
    focus: 'introductory machine learning workflows',
    videos: [VIDEO.ml, VIDEO.python, VIDEO.sql],
    coverImageUrl: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?q=80&w=1200&auto=format&fit=crop',
  },
  {
    slug: 'career-portfolio',
    title: 'Developer Portfolio and Interview Prep',
    shortDesc: 'Package your work, improve communication, and prepare for hiring loops.',
    tags: ['Career', 'Portfolio', 'Interviews'],
    focus: 'career readiness for software developers',
    videos: [VIDEO.career, VIDEO.git, VIDEO.system],
    coverImageUrl: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?q=80&w=1200&auto=format&fit=crop',
  },
];

const PROGRAM_VARIANTS = [
  'Foundations',
  'Hands-On Lab',
  'Project Workshop',
  'Practical Bootcamp',
  'Career Track',
  'Deep Dive',
  'Zero to Production',
  'Applied Skills',
  'Team Edition',
  'Masterclass',
];

const ACCESS_RULE_CYCLE = ['open', 'payment', 'open', 'invitation', 'payment', 'open'];

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const quizQuestions = (courseTitle, tags, focus) => {
  const prompts = [
    {
      question: `What is the clearest learning outcome of ${courseTitle}?`,
      options: [
        `Applying ${focus} in practical scenarios`,
        'Avoiding hands-on work',
        'Skipping debugging entirely',
        'Memorizing terminology without context',
      ],
      correct: 0,
    },
    {
      question: `Which habit supports progress in a ${tags[0]} course most?`,
      options: [
        'Working through examples consistently',
        'Ignoring exercises until the end',
        'Avoiding feedback from quizzes',
        'Reading titles without watching lessons',
      ],
      correct: 0,
    },
    {
      question: `Why is a guided resource lesson included in ${courseTitle}?`,
      options: [
        'To provide reference material that complements the videos',
        'To replace all implementation practice',
        'To block learner access to the course',
        'To remove the need for understanding core concepts',
      ],
      correct: 0,
    },
    {
      question: `What is the purpose of the course quiz in ${courseTitle}?`,
      options: [
        'To reinforce understanding before moving forward',
        'To hide the rest of the lessons',
        'To make the course impossible to complete',
        'To replace all project work',
      ],
      correct: 0,
    },
  ];

  return prompts.map((prompt, index) => ({
    questionText: prompt.question,
    sortOrder: index,
    options: {
      create: prompt.options.map((optionText, optionIndex) => ({
        optionText,
        isCorrect: optionIndex === prompt.correct,
        sortOrder: optionIndex,
      })),
    },
  }));
};

const buildCatalog = () => {
  const catalog = [];

  for (const [themeIndex, theme] of COURSE_THEMES.entries()) {
    for (const [variantIndex, variant] of PROGRAM_VARIANTS.entries()) {
      const globalIndex = themeIndex * PROGRAM_VARIANTS.length + variantIndex;
      const accessRule = ACCESS_RULE_CYCLE[globalIndex % ACCESS_RULE_CYCLE.length];
      const visibility =
        accessRule === 'invitation'
          ? 'signed_in'
          : globalIndex % 4 === 0
            ? 'signed_in'
            : 'everyone';
      const price = accessRule === 'payment' ? 499 + ((globalIndex * 73) % 11) * 100 : 0;

      catalog.push({
        websiteUrl: `seed-${theme.slug}-${slugify(variant)}-${String(variantIndex + 1).padStart(2, '0')}`,
        title: `${theme.title} ${variant}`,
        shortDesc: theme.shortDesc,
        description: `${theme.title} ${variant} is a seeded demo course focused on ${theme.focus}. It is designed so you can test catalog browsing, course detail pages, access control, enrollment, payment, invitations, media playback, and quiz functionality directly from the frontend.`,
        tags: theme.tags,
        focus: theme.focus,
        videos: theme.videos,
        accessRule,
        visibility,
        price,
        coverImageUrl: theme.coverImageUrl,
      });
    }
  }

  return catalog;
};

const buildLessonBlueprints = (course, index) => {
  const resourceType = index % 2 === 0 ? 'document' : 'image';
  const resourceUrl =
    resourceType === 'document'
      ? PDFS[index % PDFS.length]
      : IMAGE_RESOURCES[index % IMAGE_RESOURCES.length];
  const addQuiz = course.accessRule === 'payment' || index % 3 === 0;

  return {
    resourceUrl,
    addQuiz,
    lessons: [
      {
        title: `Kickoff: ${course.title}`,
        lessonType: 'video',
        description: `Course orientation and expectations for ${course.title}.`,
        videoUrl: course.videos[0],
        durationMins: 12 + (index % 6),
        allowDownload: false,
      },
      {
        title: `${course.tags[0]} Concepts in Action`,
        lessonType: 'video',
        description: `A practical walkthrough focused on ${course.focus}.`,
        videoUrl: course.videos[1],
        durationMins: 18 + (index % 8),
        allowDownload: false,
      },
      {
        title: `${course.tags[1] || course.tags[0]} Build Session`,
        lessonType: 'video',
        description: 'A build-along lesson that helps learners apply the material.',
        videoUrl: course.videos[2],
        durationMins: 20 + (index % 10),
        allowDownload: false,
      },
      {
        title: `${course.tags[0]} Reference Pack`,
        lessonType: resourceType,
        description: `A curated ${resourceType} resource to support the video content.`,
        fileUrl: resourceUrl,
        durationMins: null,
        allowDownload: true,
      },
    ],
  };
};

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

  const instructorProfiles = [
    ['Aarav Sharma', 'instructor@learnova.com'],
    ['Meera Iyer', 'meera@learnova.com'],
    ['Pranjal Verma', 'pranjal@learnova.com'],
    ['Kavya Nair', 'kavya@learnova.com'],
    ['Rohan Mehta', 'rohan@learnova.com'],
    ['Sneha Kulkarni', 'sneha@learnova.com'],
    ['Arjun Rao', 'arjun@learnova.com'],
    ['Nisha Kapoor', 'nisha@learnova.com'],
  ];

  const instructors = [];
  for (const [name, email] of instructorProfiles) {
    instructors.push(
      await prisma.user.upsert({
        where: { email },
        update: { name, role: 'instructor' },
        create: { name, email, passwordHash: hashes.instructor, role: 'instructor' },
      })
    );
  }

  const learnerProfiles = [
    ['Demo Learner', 'learner@learnova.com'],
    ['Anshu Patel', 'anshu@example.com'],
    ['Riya Singh', 'riya@example.com'],
    ['Kabir Malhotra', 'kabir@example.com'],
    ['Zoya Khan', 'zoya@example.com'],
  ];

  const learners = [];
  for (const [name, email] of learnerProfiles) {
    learners.push(
      await prisma.user.upsert({
        where: { email },
        update: { name, role: 'learner' },
        create: { name, email, passwordHash: hashes.learner, role: 'learner' },
      })
    );
  }

  return { admin, instructors, learners };
};

const createCourse = async (course, index, instructorId) => {
  const createdCourse = await prisma.course.create({
    data: {
      title: course.title,
      shortDesc: course.shortDesc,
      description: course.description,
      tags: course.tags,
      websiteUrl: course.websiteUrl,
      coverImageUrl: course.coverImageUrl,
      responsibleId: instructorId,
      isPublished: true,
      publishedAt: new Date(Date.now() - index * DAY_MS),
      visibility: course.visibility,
      accessRule: course.accessRule,
      price: course.price,
    },
  });

  const blueprint = buildLessonBlueprints(course, index);
  const lessons = [];

  for (const [lessonIndex, lesson] of blueprint.lessons.entries()) {
    const createdLesson = await prisma.lesson.create({
      data: {
        courseId: createdCourse.id,
        title: lesson.title,
        description: lesson.description,
        lessonType: lesson.lessonType,
        videoUrl: lesson.videoUrl || null,
        fileUrl: lesson.fileUrl || null,
        durationMins: lesson.durationMins,
        allowDownload: lesson.allowDownload,
        sortOrder: lessonIndex,
        responsibleId: instructorId,
      },
    });

    lessons.push(createdLesson);

    if (lesson.lessonType === 'document' || lesson.lessonType === 'image') {
      await prisma.lessonAttachment.createMany({
        data: [
          {
            lessonId: createdLesson.id,
            attachmentType: 'link',
            label: `${course.tags[0]} companion resource`,
            url: blueprint.resourceUrl,
            sortOrder: 0,
          },
          {
            lessonId: createdLesson.id,
            attachmentType: 'link',
            label: `${course.tags[0]} study checklist`,
            url: PDFS[(index + 1) % PDFS.length],
            sortOrder: 1,
          },
        ],
      });
    }
  }

  let quiz = null;

  if (blueprint.addQuiz) {
    const quizLesson = await prisma.lesson.create({
      data: {
        courseId: createdCourse.id,
        title: `${course.tags[0]} Knowledge Check`,
        description: `Checkpoint quiz for ${course.title}.`,
        lessonType: 'quiz',
        sortOrder: lessons.length,
        responsibleId: instructorId,
      },
    });

    lessons.push(quizLesson);

    quiz = await prisma.quiz.create({
      data: {
        courseId: createdCourse.id,
        lessonId: quizLesson.id,
        title: `${course.title} Quiz`,
        questions: { create: quizQuestions(course.title, course.tags, course.focus) },
      },
    });
  }

  return { ...createdCourse, lessons, quiz };
};

const seedCatalog = async ({ instructors }) => {
  const catalog = buildCatalog();

  await prisma.course.deleteMany({
    where: {
      websiteUrl: {
        startsWith: 'seed-',
      },
    },
  });

  const created = [];
  for (const [index, course] of catalog.entries()) {
    created.push(await createCourse(course, index, instructors[index % instructors.length].id));
  }

  return created;
};

const createEnrollmentBundle = async ({
  learner,
  course,
  status,
  paid,
  enrolledAt,
  reviewRating,
  reviewText,
  createQuizAttempt,
}) => {
  const completedAt = status === 'completed' ? new Date(enrolledAt.getTime() + 4 * 60 * 60 * 1000) : null;
  const isStarted = status === 'in_progress' || status === 'completed';
  const startedAt = isStarted ? new Date(enrolledAt.getTime() + 30 * 60 * 1000) : null;

  const enrollment = await prisma.enrollment.create({
    data: {
      userId: learner.id,
      courseId: course.id,
      status,
      enrolledAt,
      startedAt,
      completedAt,
      timeSpentMins: status === 'completed' ? 120 : status === 'in_progress' ? 48 : 0,
      isPaid: paid,
      paidAt: paid ? new Date(enrolledAt.getTime() + 45 * 60 * 1000) : null,
      amountPaid: paid ? course.price : null,
    },
  });

  await prisma.courseLearner.create({
    data: {
      userId: learner.id,
      courseId: course.id,
    },
  });

  const nonQuizLessons = course.lessons.filter((lesson) => lesson.lessonType !== 'quiz');
  const progressCount =
    status === 'completed'
      ? nonQuizLessons.length
      : status === 'in_progress'
        ? Math.min(2, nonQuizLessons.length)
        : 0;

  for (const [index, lesson] of nonQuizLessons.slice(0, progressCount).entries()) {
    await prisma.lessonProgress.create({
      data: {
        userId: learner.id,
        lessonId: lesson.id,
        enrollmentId: enrollment.id,
        isCompleted: true,
        completedAt: new Date(enrolledAt.getTime() + (index + 1) * 60 * 60 * 1000),
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
        receipt: `seed_receipt_${course.websiteUrl}_${slugify(learner.email)}`,
        providerOrderId: `seed_order_${course.websiteUrl}_${slugify(learner.email)}`,
        providerPaymentId: `seed_payment_${course.websiteUrl}_${slugify(learner.email)}`,
        providerPayload: {
          seeded: true,
          provider: 'stripe',
          course: course.websiteUrl,
          learner: learner.email,
        },
        paidAt: new Date(enrolledAt.getTime() + 45 * 60 * 1000),
      },
    });
  }

  if (course.quiz && createQuizAttempt) {
    const totalQuestions = 4;
    const correctAnswers = status === 'completed' ? 4 : 3;
    const passed = correctAnswers >= 3;

    await prisma.quizAttempt.create({
      data: {
        userId: learner.id,
        quizId: course.quiz.id,
        enrollmentId: enrollment.id,
        attemptNumber: 1,
        totalQuestions,
        correctAnswers,
        pointsEarned: passed ? 10 : 7,
        passed,
        attemptedAt: new Date(enrolledAt.getTime() + 5 * 60 * 60 * 1000),
      },
    });

    const quizLesson = course.lessons.find((lesson) => lesson.lessonType === 'quiz');
    if (quizLesson && passed) {
      await prisma.lessonProgress.upsert({
        where: {
          userId_lessonId: {
            userId: learner.id,
            lessonId: quizLesson.id,
          },
        },
        update: {
          isCompleted: true,
          completedAt: new Date(enrolledAt.getTime() + 5 * 60 * 60 * 1000),
        },
        create: {
          userId: learner.id,
          lessonId: quizLesson.id,
          enrollmentId: enrollment.id,
          isCompleted: true,
          completedAt: new Date(enrolledAt.getTime() + 5 * 60 * 60 * 1000),
        },
      });
    }
  }

  if (reviewRating && reviewText) {
    await prisma.review.create({
      data: {
        userId: learner.id,
        courseId: course.id,
        rating: reviewRating,
        reviewText,
      },
    });
  }
};

const seedInvitationRecords = async ({ admin, learners }, invitationCourses) => {
  const [demoLearner, anshuLearner, riyaLearner, kabirLearner, zoyaLearner] = learners;

  for (const [index, course] of invitationCourses.slice(0, 45).entries()) {
    const configs = [
      { learner: demoLearner, status: index < 15 ? 'accepted' : 'pending' },
      { learner: riyaLearner, status: index % 4 === 0 ? 'accepted' : 'pending' },
      { learner: kabirLearner, status: index % 6 === 0 ? 'accepted' : 'pending' },
      { learner: zoyaLearner, status: index % 10 === 0 ? 'accepted' : 'pending' },
      { learner: anshuLearner, status: index % 9 === 0 ? 'accepted' : 'pending' },
    ];

    for (const { learner, status } of configs) {
      await prisma.courseInvitation.create({
        data: {
          courseId: course.id,
          invitedBy: admin.id,
          email: learner.email,
          userId: learner.id,
          status,
          token: crypto.randomUUID(),
          acceptedAt: status === 'accepted' ? new Date(Date.now() - index * DAY_MS) : null,
          expiresAt: new Date(Date.now() + 21 * DAY_MS),
        },
      });
    }
  }
};

const seedLearnerData = async ({ admin, learners }, courses) => {
  const [demoLearner, anshuLearner, riyaLearner, kabirLearner, zoyaLearner] = learners;
  const openCourses = courses.filter((course) => course.accessRule === 'open');
  const paymentCourses = courses.filter((course) => course.accessRule === 'payment');
  const invitationCourses = courses.filter((course) => course.accessRule === 'invitation');

  await seedInvitationRecords({ admin, learners }, invitationCourses);

  const enrollmentPlans = [
    ...openCourses.slice(0, 18).map((course, index) => ({
      learner: demoLearner,
      course,
      status: index % 5 === 0 ? 'completed' : 'in_progress',
      paid: false,
      reviewRating: index < 6 ? 5 - (index % 2) : null,
      reviewText: index < 6 ? 'Helpful seeded course with clear lessons and easy frontend testing flow.' : null,
      createQuizAttempt: index % 2 === 0,
    })),
    ...paymentCourses.slice(0, 12).map((course, index) => ({
      learner: anshuLearner,
      course,
      status: index % 4 === 0 ? 'completed' : 'in_progress',
      paid: true,
      reviewRating: index < 4 ? 5 : null,
      reviewText: index < 4 ? 'Payment, progress, and quiz flow worked smoothly in this seeded course.' : null,
      createQuizAttempt: true,
    })),
    ...paymentCourses.slice(12, 18).map((course, index) => ({
      learner: demoLearner,
      course,
      status: index % 3 === 0 ? 'completed' : 'in_progress',
      paid: true,
      reviewRating: null,
      reviewText: null,
      createQuizAttempt: index % 2 === 0,
    })),
    ...invitationCourses.slice(0, 10).map((course, index) => ({
      learner: demoLearner,
      course,
      status: index % 3 === 0 ? 'completed' : 'in_progress',
      paid: false,
      reviewRating: null,
      reviewText: null,
      createQuizAttempt: true,
    })),
    ...invitationCourses.slice(10, 16).map((course, index) => ({
      learner: riyaLearner,
      course,
      status: index % 2 === 0 ? 'in_progress' : 'completed',
      paid: false,
      reviewRating: null,
      reviewText: null,
      createQuizAttempt: index % 2 === 0,
    })),
    ...openCourses.slice(18, 26).map((course, index) => ({
      learner: kabirLearner,
      course,
      status: index % 2 === 0 ? 'in_progress' : 'completed',
      paid: false,
      reviewRating: null,
      reviewText: null,
      createQuizAttempt: index % 2 === 1,
    })),
    ...openCourses.slice(26, 32).map((course, index) => ({
      learner: zoyaLearner,
      course,
      status: 'in_progress',
      paid: false,
      reviewRating: null,
      reviewText: null,
      createQuizAttempt: index % 2 === 0,
    })),
  ];

  for (const [index, plan] of enrollmentPlans.entries()) {
    await createEnrollmentBundle({
      ...plan,
      enrolledAt: new Date(Date.now() - (index + 2) * DAY_MS),
    });
  }
};

async function main() {
  const seededUsers = await createUsers();
  console.log('🌱 Users seeded.');

  const courses = await seedCatalog(seededUsers);
  console.log(`🌱 ${courses.length} courses seeded.`);

  await seedLearnerData(seededUsers, courses);
  console.log('🌱 Invitations, enrollments, payments, reviews, progress, and quizzes seeded.');

  const counts = await Promise.all([
    prisma.course.count({ where: { websiteUrl: { startsWith: 'seed-' } } }),
    prisma.lesson.count({
      where: {
        course: {
          websiteUrl: {
            startsWith: 'seed-',
          },
        },
      },
    }),
    prisma.quiz.count({
      where: {
        course: {
          websiteUrl: {
            startsWith: 'seed-',
          },
        },
      },
    }),
  ]);

  console.log(`✅ Seed summary: ${counts[0]} courses, ${counts[1]} lessons, ${counts[2]} quizzes.`);
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
