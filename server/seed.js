import pool from './db.js';

export async function seedDummyData() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ─── 1. Seed Instructors ────────────────────────────────────────────────
    const instructor1Res = await client.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('John Doe', 'john@learnova.com', '$2b$10$0fvcA1zLhqfFTH/gj0waoef1NkbuTuOW6yGVf3Spo2Ajrf9SrXHZ.', 'instructor')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `);
    const instructor1Id = instructor1Res.rows[0].id;

    const instructor2Res = await client.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Alice Johnson', 'alice@learnova.com', '$2b$10$.XqIwFmjlleN6CeKCavlPOKr4UtJEzsaOxpZYuMlIrXa4DpAS9ACi', 'instructor')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `);
    const instructor2Id = instructor2Res.rows[0].id;

    // ─── 2. Seed Learners ────────────────────────────────────────────────────
    const learner1Res = await client.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Jane Smith', 'jane@learnova.com', '$2b$10$0fvcA1zLhqfFTH/gj0waoef1NkbuTuOW6yGVf3Spo2Ajrf9SrXHZ.', 'learner')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `);
    const learner1Id = learner1Res.rows[0].id;

    const learner2Res = await client.query(`
      INSERT INTO users (name, email, password_hash, role, total_points)
      VALUES ('Bob Wilson', 'bob@learnova.com', '$2b$10$.XqIwFmjlleN6CeKCavlPOKr4UtJEzsaOxpZYuMlIrXa4DpAS9ACi', 'learner', 50)
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `);
    const learner2Id = learner2Res.rows[0].id;

    // ─── 3. Seed Courses ──────────────────────────────────────────────────────
    const coursesData = [
      {
        title: 'JavaScript for Beginners',
        short_desc: 'Learn the fundamentals of JavaScript from scratch.',
        description: 'A complete beginner-friendly course covering variables, functions, DOM, and async JS.',
        tags: ['javascript', 'web', 'beginners'],
        website_url: 'https://learnova.com/courses/js-beginners',
        is_published: true,
        visibility: 'everyone',
        access_rule: 'open',
        instructor: instructor1Id
      },
      {
        title: 'React & Redux Masterclass',
        short_desc: 'Build production-grade React apps with Redux Toolkit.',
        description: 'Deep dive into React hooks, context, Redux Toolkit, RTK Query, and testing.',
        tags: ['react', 'redux', 'frontend'],
        website_url: 'https://learnova.com/courses/react-redux',
        is_published: true,
        visibility: 'everyone',
        access_rule: 'payment',
        price: 999.00,
        instructor: instructor1Id
      },
      {
        title: 'Python Data Science Bootcamp',
        short_desc: 'Master data analysis and ML with Python.',
        description: 'Covers NumPy, Pandas, Matplotlib, Scikit-learn and real-world projects.',
        tags: ['python', 'data-science', 'ml'],
        website_url: 'https://learnova.com/courses/python-ds',
        is_published: true,
        visibility: 'signed_in',
        access_rule: 'open',
        instructor: instructor2Id
      },
      {
        title: 'Advanced CSS and Sass',
        short_desc: 'Master CSS layouts, animations, and Sass features.',
        description: 'Learn Flexbox, Grid, advanced animations, and robust CSS architecture with Sass.',
        tags: ['css', 'sass', 'frontend'],
        website_url: 'https://learnova.com/courses/advanced-css',
        is_published: true,
        visibility: 'everyone',
        access_rule: 'open',
        instructor: instructor2Id
      },
      {
        title: 'Node.js Backend Architecture',
        short_desc: 'Build scalable APIs with Node, Express, and PostgreSQL.',
        description: 'Learn modern backend practices, authentication, database design, and deployment.',
        tags: ['node', 'postgresql', 'backend'],
        website_url: 'https://learnova.com/courses/node-backend',
        is_published: false,
        visibility: 'signed_in',
        access_rule: 'invitation',
        instructor: instructor1Id
      },
    ];

    const courseIds = [];
    for (const c of coursesData) {
      const res = await client.query(
        `INSERT INTO courses
          (title, short_desc, description, tags, website_url, responsible_id,
           is_published, published_at, visibility, access_rule, price)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8,$9,$10)
         ON CONFLICT DO NOTHING
         RETURNING id;`,
        [
          c.title, c.short_desc, c.description, c.tags,
          c.website_url, c.instructor, c.is_published,
          c.visibility, c.access_rule, c.price ?? null,
        ]
      );
      if (res.rows[0]) courseIds.push(res.rows[0].id);
    }

    const [jsId, reactId, pythonId, cssId, nodeId] = courseIds;

    // ─── 4. Seed Lessons ──────────────────────────────────────────────────────
    const lessonsData = [
      // JS Course
      { course_id: jsId, title: 'What is JavaScript?',       lesson_type: 'video',    video_url: 'https://youtube.com/watch?v=dummy1', duration_mins: 10, sort_order: 1, instructor: instructor1Id },
      { course_id: jsId, title: 'Variables & Data Types',    lesson_type: 'video',    video_url: 'https://youtube.com/watch?v=dummy2', duration_mins: 15, sort_order: 2, instructor: instructor1Id },
      { course_id: jsId, title: 'Functions & Scope',         lesson_type: 'document', file_url: 'https://cdn.learnova.com/js-functions.pdf', allow_download: true, sort_order: 3, instructor: instructor1Id },
      { course_id: jsId, title: 'JS Cheatsheet',             lesson_type: 'document', file_url: 'https://cdn.learnova.com/js-cheatsheet.pdf', allow_download: true, sort_order: 4, instructor: instructor1Id },
      { course_id: jsId, title: 'JS Basics Quiz',            lesson_type: 'quiz',     sort_order: 5, instructor: instructor1Id },

      // React Course
      { course_id: reactId, title: 'React Introduction',     lesson_type: 'video',    video_url: 'https://youtube.com/watch?v=dummy3', duration_mins: 12, sort_order: 1, instructor: instructor1Id },
      { course_id: reactId, title: 'useState & useEffect',   lesson_type: 'video',    video_url: 'https://youtube.com/watch?v=dummy4', duration_mins: 20, sort_order: 2, instructor: instructor1Id },
      { course_id: reactId, title: 'React Hooks Quiz',       lesson_type: 'quiz',     sort_order: 3, instructor: instructor1Id },

      // Python Course
      { course_id: pythonId, title: 'Python Basics',         lesson_type: 'video',    video_url: 'https://youtube.com/watch?v=dummy5', duration_mins: 18, sort_order: 1, instructor: instructor2Id },
      { course_id: pythonId, title: 'NumPy & Pandas Intro',  lesson_type: 'video',    video_url: 'https://youtube.com/watch?v=dummy6', duration_mins: 25, sort_order: 2, instructor: instructor2Id },
      { course_id: pythonId, title: 'Data Cleaning Guide',   lesson_type: 'document', file_url: 'https://cdn.learnova.com/pandas-cleaning.pdf', allow_download: true, sort_order: 3, instructor: instructor2Id },
      { course_id: pythonId, title: 'Python DS Quiz',        lesson_type: 'quiz',     sort_order: 4, instructor: instructor2Id },
      
      // CSS Course
      { course_id: cssId, title: 'CSS Grid vs Flexbox',      lesson_type: 'video',    video_url: 'https://youtube.com/watch?v=dummy7', duration_mins: 22, sort_order: 1, instructor: instructor2Id },
      { course_id: cssId, title: 'Sass Variables & Mixins',  lesson_type: 'video',    video_url: 'https://youtube.com/watch?v=dummy8', duration_mins: 15, sort_order: 2, instructor: instructor2Id },
      { course_id: cssId, title: 'CSS Animations Quiz',      lesson_type: 'quiz',     sort_order: 3, instructor: instructor2Id },

      // Node Course
      { course_id: nodeId, title: 'Express & Middleware',    lesson_type: 'video',    video_url: 'https://youtube.com/watch?v=dummy9', duration_mins: 30, sort_order: 1, instructor: instructor1Id },
    ];

    const lessonIds = {};  // { 'JS Basics Quiz': uuid, ... }
    for (const l of lessonsData) {
      const res = await client.query(
        `INSERT INTO lessons
          (course_id, title, lesson_type, video_url, duration_mins,
           file_url, allow_download, sort_order, responsible_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id, title;`,
        [
          l.course_id, l.title, l.lesson_type,
          l.video_url ?? null, l.duration_mins ?? null,
          l.file_url ?? null, l.allow_download ?? false,
          l.sort_order, l.instructor,
        ]
      );
      lessonIds[l.title] = res.rows[0].id;
    }

    // ─── 5. Seed Quizzes ──────────────────────────────────────────────────────
    const quizzesData = [
      {
        course_id: jsId,
        lesson_id: lessonIds['JS Basics Quiz'],
        title: 'JavaScript Basics Quiz',
        points_attempt_1: 10, points_attempt_2: 7, points_attempt_3: 4, points_attempt_4plus: 2,
      },
      {
        course_id: reactId,
        lesson_id: lessonIds['React Hooks Quiz'],
        title: 'React Hooks Quiz',
        points_attempt_1: 15, points_attempt_2: 10, points_attempt_3: 5, points_attempt_4plus: 2,
      },
      {
        course_id: pythonId,
        lesson_id: lessonIds['Python DS Quiz'],
        title: 'Python Data Science Quiz',
        points_attempt_1: 12, points_attempt_2: 8, points_attempt_3: 4, points_attempt_4plus: 2,
      },
      {
        course_id: cssId,
        lesson_id: lessonIds['CSS Animations Quiz'],
        title: 'CSS Animations Quiz',
        points_attempt_1: 10, points_attempt_2: 7, points_attempt_3: 4, points_attempt_4plus: 2,
      },
    ];

    const quizIds = [];
    for (const q of quizzesData) {
      const res = await client.query(
        `INSERT INTO quizzes
          (course_id, lesson_id, title,
           points_attempt_1, points_attempt_2, points_attempt_3, points_attempt_4plus)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING id;`,
        [
          q.course_id, q.lesson_id, q.title,
          q.points_attempt_1, q.points_attempt_2,
          q.points_attempt_3, q.points_attempt_4plus,
        ]
      );
      quizIds.push(res.rows[0].id);
    }

    const [jsQuizId, reactQuizId, pythonQuizId, cssQuizId] = quizIds;

    // ─── 6. Seed Quiz Questions & Options ────────────────────────────────────
    const quizContent = [
      {
        quiz_id: jsQuizId,
        questions: [
          {
            text: 'Which keyword declares a block-scoped variable in JavaScript?',
            options: [
              { text: 'var',   correct: false },
              { text: 'let',   correct: true  },
              { text: 'def',   correct: false },
              { text: 'int',   correct: false },
            ],
          },
          {
            text: 'What does "===" check in JavaScript?',
            options: [
              { text: 'Only value equality',              correct: false },
              { text: 'Only type equality',               correct: false },
              { text: 'Both value and type equality',     correct: true  },
              { text: 'Neither value nor type equality',  correct: false },
            ],
          },
          {
            text: 'Which method adds an element to the end of an array?',
            options: [
              { text: 'push()',    correct: true  },
              { text: 'pop()',     correct: false },
              { text: 'shift()',   correct: false },
              { text: 'splice()',  correct: false },
            ],
          },
        ],
      },
      {
        quiz_id: reactQuizId,
        questions: [
          {
            text: 'Which hook is used to manage state in a functional component?',
            options: [
              { text: 'useEffect',  correct: false },
              { text: 'useState',   correct: true  },
              { text: 'useContext', correct: false },
              { text: 'useRef',     correct: false },
            ],
          },
          {
            text: 'When does useEffect with an empty dependency array run?',
            options: [
              { text: 'On every re-render',              correct: false },
              { text: 'Only once after the first render', correct: true  },
              { text: 'Only on unmount',                  correct: false },
              { text: 'Never',                            correct: false },
            ],
          },
          {
            text: 'What does the key prop help React do in a list?',
            options: [
              { text: 'Style list items',                    correct: false },
              { text: 'Identify which items have changed',   correct: true  },
              { text: 'Sort the list automatically',         correct: false },
              { text: 'Add event listeners to list items',   correct: false },
            ],
          },
        ],
      },
      {
        quiz_id: pythonQuizId,
        questions: [
          {
            text: 'Which Python library is primarily used for data manipulation?',
            options: [
              { text: 'NumPy',      correct: false },
              { text: 'Pandas',     correct: true  },
              { text: 'Matplotlib', correct: false },
              { text: 'Seaborn',    correct: false },
            ],
          },
          {
            text: 'What does df.head() return in Pandas?',
            options: [
              { text: 'Last 5 rows of the DataFrame',   correct: false },
              { text: 'First 5 rows of the DataFrame',  correct: true  },
              { text: 'Column names of the DataFrame',  correct: false },
              { text: 'Shape of the DataFrame',         correct: false },
            ],
          },
          {
            text: 'Which Scikit-learn class is used for linear regression?',
            options: [
              { text: 'LinearModel()',       correct: false },
              { text: 'LinearRegression()',  correct: true  },
              { text: 'Regressor()',         correct: false },
              { text: 'FitLine()',           correct: false },
            ],
          },
        ],
      },
      {
        quiz_id: cssQuizId,
        questions: [
          {
            text: 'Which property creates a CSS Grid container?',
            options: [
              { text: 'display: grid',       correct: true  },
              { text: 'grid: container',     correct: false },
              { text: 'display: block',      correct: false },
              { text: 'grid-template',       correct: false },
            ],
          },
          {
            text: 'What is a Sass mixin used for?',
            options: [
              { text: 'Defining variables',                 correct: false },
              { text: 'Importing external CSS',             correct: false },
              { text: 'Creating reusable blocks of styles', correct: true  },
              { text: 'Compiling Sass to CSS',              correct: false },
            ],
          },
        ],
      },
    ];

    for (const quiz of quizContent) {
      for (let qi = 0; qi < quiz.questions.length; qi++) {
        const q = quiz.questions[qi];
        const qRes = await client.query(
          `INSERT INTO quiz_questions (quiz_id, question_text, sort_order)
           VALUES ($1, $2, $3) RETURNING id;`,
          [quiz.quiz_id, q.text, qi + 1]
        );
        const questionId = qRes.rows[0].id;

        for (let oi = 0; oi < q.options.length; oi++) {
          const o = q.options[oi];
          await client.query(
            `INSERT INTO quiz_options (question_id, option_text, is_correct, sort_order)
             VALUES ($1, $2, $3, $4);`,
            [questionId, o.text, o.correct, oi + 1]
          );
        }
      }
    }

    await client.query(`
      INSERT INTO enrollments (user_id, course_id, status, time_spent_mins)
      VALUES ($1, $2, 'not_started', 0)
      ON CONFLICT (user_id, course_id) DO NOTHING;
    `, [learner1Id, jsId]);

    await client.query(`
      INSERT INTO enrollments (user_id, course_id, status, time_spent_mins)
      VALUES ($1, $2, 'in_progress', 45)
      ON CONFLICT (user_id, course_id) DO NOTHING;
    `, [learner1Id, reactId]);
    
    await client.query(`
      INSERT INTO enrollments (user_id, course_id, status, time_spent_mins, is_paid, amount_paid)
      VALUES ($1, $2, 'in_progress', 120, true, 999.00)
      ON CONFLICT (user_id, course_id) DO NOTHING;
    `, [learner2Id, reactId]);

    await client.query(`
      INSERT INTO enrollments (user_id, course_id, status, time_spent_mins)
      VALUES ($1, $2, 'completed', 300)
      ON CONFLICT (user_id, course_id) DO NOTHING;
    `, [learner2Id, pythonId]);

    await client.query('COMMIT');
    console.log('🌱 Seed complete!');
    console.log('   → 5 courses (JS, React, Python, CSS, Node)');
    console.log('   → 16 lessons across all courses');
    console.log('   → 4 quizzes');
    console.log('   → 2 instructors (john@learnova.com, alice@learnova.com)');
    console.log('   → 2 learners (jane@learnova.com, bob@learnova.com) with enrollments');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed, transaction rolled back:', err.message);
    throw err;
  } finally {
    client.release();
  }
}