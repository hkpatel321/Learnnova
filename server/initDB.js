import pool from './db.js'; // your pg Pool instance

export async function initDB() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ─── Extensions ─────────────────────────────────────────────────────────
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // ─── 1. USERS ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
        name          VARCHAR(150)  NOT NULL,
        email         VARCHAR(255)  NOT NULL UNIQUE,
        password_hash VARCHAR(255)  NOT NULL,
        role          VARCHAR(20)   NOT NULL DEFAULT 'learner'
                          CHECK (role IN ('admin', 'instructor', 'learner')),
        avatar_url    TEXT,
        total_points  INTEGER       NOT NULL DEFAULT 0 CHECK (total_points >= 0),
        is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
    `);

    // ─── 2. COURSES ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
        title           VARCHAR(255)  NOT NULL,
        short_desc      TEXT,
        description     TEXT,
        cover_image_url TEXT,
        tags            TEXT[]        NOT NULL DEFAULT '{}',
        website_url     VARCHAR(500),
        responsible_id  UUID          REFERENCES users(id) ON DELETE SET NULL,
        is_published    BOOLEAN       NOT NULL DEFAULT FALSE,
        published_at    TIMESTAMPTZ,
        visibility      VARCHAR(20)   NOT NULL DEFAULT 'everyone'
                            CHECK (visibility IN ('everyone', 'signed_in')),
        access_rule     VARCHAR(20)   NOT NULL DEFAULT 'open'
                            CHECK (access_rule IN ('open', 'invitation', 'payment')),
        price           NUMERIC(10,2) CHECK (price >= 0),
        views_count     INTEGER       NOT NULL DEFAULT 0 CHECK (views_count >= 0),
        created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
    `);

    // Courses constraints (safe to re-run via DO block)
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_published_needs_website'
        ) THEN
          ALTER TABLE courses
            ADD CONSTRAINT chk_published_needs_website
            CHECK (is_published = FALSE OR (is_published = TRUE AND website_url IS NOT NULL));
        END IF;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_payment_needs_price'
        ) THEN
          ALTER TABLE courses
            ADD CONSTRAINT chk_payment_needs_price
            CHECK (access_rule != 'payment' OR (access_rule = 'payment' AND price IS NOT NULL));
        END IF;
      END $$;
    `);

    // ─── 3. LESSONS ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS lessons (
        id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
        course_id      UUID          NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title          VARCHAR(255)  NOT NULL,
        lesson_type    VARCHAR(20)   NOT NULL
                           CHECK (lesson_type IN ('video', 'document', 'image', 'quiz')),
        description    TEXT,
        video_url      TEXT,
        duration_mins  INTEGER       CHECK (duration_mins > 0),
        file_url       TEXT,
        allow_download BOOLEAN       NOT NULL DEFAULT FALSE,
        sort_order     INTEGER       NOT NULL DEFAULT 0,
        responsible_id UUID          REFERENCES users(id) ON DELETE SET NULL,
        created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
    `);

    // ─── 4. LESSON ATTACHMENTS ───────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS lesson_attachments (
        id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
        lesson_id       UUID          NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        attachment_type VARCHAR(10)   NOT NULL CHECK (attachment_type IN ('file', 'link')),
        label           VARCHAR(255)  NOT NULL,
        url             TEXT          NOT NULL,
        sort_order      INTEGER       NOT NULL DEFAULT 0,
        created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
    `);

    // ─── 5. QUIZZES ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id                   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
        course_id            UUID          NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        lesson_id            UUID          REFERENCES lessons(id) ON DELETE SET NULL,
        title                VARCHAR(255)  NOT NULL,
        points_attempt_1     INTEGER       NOT NULL DEFAULT 10 CHECK (points_attempt_1 >= 0),
        points_attempt_2     INTEGER       NOT NULL DEFAULT 7  CHECK (points_attempt_2 >= 0),
        points_attempt_3     INTEGER       NOT NULL DEFAULT 4  CHECK (points_attempt_3 >= 0),
        points_attempt_4plus INTEGER       NOT NULL DEFAULT 2  CHECK (points_attempt_4plus >= 0),
        created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
    `);

    // ─── 6. QUIZ QUESTIONS ───────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
        quiz_id       UUID          NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
        question_text TEXT          NOT NULL,
        sort_order    INTEGER       NOT NULL DEFAULT 0,
        created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
    `);

    // ─── 7. QUIZ OPTIONS ─────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_options (
        id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
        question_id UUID          NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
        option_text TEXT          NOT NULL,
        is_correct  BOOLEAN       NOT NULL DEFAULT FALSE,
        sort_order  INTEGER       NOT NULL DEFAULT 0
      );
    `);

    // ─── 8. ENROLLMENTS ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id       UUID          NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        status          VARCHAR(20)   NOT NULL DEFAULT 'not_started'
                            CHECK (status IN ('not_started', 'in_progress', 'completed')),
        enrolled_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        started_at      TIMESTAMPTZ,
        completed_at    TIMESTAMPTZ,
        time_spent_mins INTEGER       NOT NULL DEFAULT 0 CHECK (time_spent_mins >= 0),
        is_paid         BOOLEAN       NOT NULL DEFAULT FALSE,
        paid_at         TIMESTAMPTZ,
        amount_paid     NUMERIC(10,2),
        UNIQUE (user_id, course_id)
      );
    `);

    // ─── 9. LESSON PROGRESS ──────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS lesson_progress (
        id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id       UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lesson_id     UUID          NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        enrollment_id UUID          NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
        is_completed  BOOLEAN       NOT NULL DEFAULT FALSE,
        completed_at  TIMESTAMPTZ,
        UNIQUE (user_id, lesson_id)
      );
    `);

    // ─── 10. QUIZ ATTEMPTS ───────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        quiz_id         UUID          NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
        enrollment_id   UUID          NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
        attempt_number  INTEGER       NOT NULL CHECK (attempt_number >= 1),
        total_questions INTEGER       NOT NULL,
        correct_answers INTEGER       NOT NULL DEFAULT 0,
        points_earned   INTEGER       NOT NULL DEFAULT 0 CHECK (points_earned >= 0),
        passed          BOOLEAN       NOT NULL DEFAULT FALSE,
        attempted_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
    `);

    // ─── 11. QUIZ ATTEMPT ANSWERS ────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
        id                 UUID     PRIMARY KEY DEFAULT uuid_generate_v4(),
        attempt_id         UUID     NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
        question_id        UUID     NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
        selected_option_id UUID     REFERENCES quiz_options(id) ON DELETE SET NULL,
        is_correct         BOOLEAN  NOT NULL DEFAULT FALSE
      );
    `);

    // ─── 12. REVIEWS ─────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id     UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id   UUID          NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        rating      SMALLINT      NOT NULL CHECK (rating BETWEEN 1 AND 5),
        review_text TEXT,
        created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, course_id)
      );
    `);

    // ─── 13. COURSE INVITATIONS ──────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS course_invitations (
        id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
        course_id   UUID          NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        invited_by  UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email       VARCHAR(255)  NOT NULL,
        user_id     UUID          REFERENCES users(id) ON DELETE SET NULL,
        status      VARCHAR(20)   NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'accepted', 'expired')),
        token       VARCHAR(255)  NOT NULL UNIQUE,
        invited_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        accepted_at TIMESTAMPTZ,
        expires_at  TIMESTAMPTZ   NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
        UNIQUE (course_id, email)
      );
    `);

    // ─── INDEXES ─────────────────────────────────────────────────────────────
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_users_email          ON users(email)`,
      `CREATE INDEX IF NOT EXISTS idx_users_role           ON users(role)`,
      `CREATE INDEX IF NOT EXISTS idx_courses_published    ON courses(is_published)`,
      `CREATE INDEX IF NOT EXISTS idx_courses_visibility   ON courses(visibility)`,
      `CREATE INDEX IF NOT EXISTS idx_courses_responsible  ON courses(responsible_id)`,
      `CREATE INDEX IF NOT EXISTS idx_courses_tags         ON courses USING GIN(tags)`,
      `CREATE INDEX IF NOT EXISTS idx_lessons_course       ON lessons(course_id)`,
      `CREATE INDEX IF NOT EXISTS idx_lessons_type         ON lessons(lesson_type)`,
      `CREATE INDEX IF NOT EXISTS idx_lessons_order        ON lessons(course_id, sort_order)`,
      `CREATE INDEX IF NOT EXISTS idx_attachments_lesson   ON lesson_attachments(lesson_id)`,
      `CREATE INDEX IF NOT EXISTS idx_quizzes_course       ON quizzes(course_id)`,
      `CREATE INDEX IF NOT EXISTS idx_quizzes_lesson       ON quizzes(lesson_id)`,
      `CREATE INDEX IF NOT EXISTS idx_questions_quiz       ON quiz_questions(quiz_id)`,
      `CREATE INDEX IF NOT EXISTS idx_options_question     ON quiz_options(question_id)`,
      `CREATE INDEX IF NOT EXISTS idx_enrollments_user     ON enrollments(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_enrollments_course   ON enrollments(course_id)`,
      `CREATE INDEX IF NOT EXISTS idx_enrollments_status   ON enrollments(status)`,
      `CREATE INDEX IF NOT EXISTS idx_lp_user              ON lesson_progress(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_lp_lesson            ON lesson_progress(lesson_id)`,
      `CREATE INDEX IF NOT EXISTS idx_lp_enrollment        ON lesson_progress(enrollment_id)`,
      `CREATE INDEX IF NOT EXISTS idx_qa_user              ON quiz_attempts(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_qa_quiz              ON quiz_attempts(quiz_id)`,
      `CREATE INDEX IF NOT EXISTS idx_qa_enrollment        ON quiz_attempts(enrollment_id)`,
      `CREATE INDEX IF NOT EXISTS idx_reviews_course       ON reviews(course_id)`,
      `CREATE INDEX IF NOT EXISTS idx_reviews_user         ON reviews(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_invitations_course   ON course_invitations(course_id)`,
      `CREATE INDEX IF NOT EXISTS idx_invitations_email    ON course_invitations(email)`,
      `CREATE INDEX IF NOT EXISTS idx_invitations_token    ON course_invitations(token)`,
    ];
    for (const idx of indexes) await client.query(idx);

    // ─── VIEWS ───────────────────────────────────────────────────────────────
    await client.query(`
      CREATE OR REPLACE VIEW vw_course_progress AS
      SELECT
        e.id              AS enrollment_id,
        e.user_id,
        e.course_id,
        e.status,
        e.time_spent_mins,
        COUNT(l.id)                                             AS total_lessons,
        COUNT(lp.id) FILTER (WHERE lp.is_completed = TRUE)     AS completed_lessons,
        CASE
          WHEN COUNT(l.id) = 0 THEN 0
          ELSE ROUND(
            COUNT(lp.id) FILTER (WHERE lp.is_completed = TRUE)
            * 100.0 / COUNT(l.id)
          )
        END                                                     AS completion_pct
      FROM enrollments e
      JOIN lessons l     ON l.course_id = e.course_id
      LEFT JOIN lesson_progress lp
        ON lp.lesson_id = l.id AND lp.user_id = e.user_id
      GROUP BY e.id, e.user_id, e.course_id, e.status, e.time_spent_mins;
    `);

    await client.query(`
      CREATE OR REPLACE VIEW vw_course_ratings AS
      SELECT
        course_id,
        COUNT(*)                        AS review_count,
        ROUND(AVG(rating)::NUMERIC, 1)  AS avg_rating
      FROM reviews
      GROUP BY course_id;
    `);

    await client.query(`
      CREATE OR REPLACE VIEW vw_learner_badges AS
      SELECT
        id           AS user_id,
        name,
        total_points,
        CASE
          WHEN total_points >= 120 THEN 'Master'
          WHEN total_points >= 100 THEN 'Expert'
          WHEN total_points >=  80 THEN 'Specialist'
          WHEN total_points >=  60 THEN 'Achiever'
          WHEN total_points >=  40 THEN 'Explorer'
          ELSE 'Newbie'
        END          AS badge,
        CASE
          WHEN total_points >= 120 THEN 120
          WHEN total_points >= 100 THEN 120
          WHEN total_points >=  80 THEN 100
          WHEN total_points >=  60 THEN  80
          WHEN total_points >=  40 THEN  60
          ELSE 40
        END          AS next_badge_threshold
      FROM users
      WHERE role = 'learner';
    `);

    await client.query(`
      CREATE OR REPLACE VIEW vw_reporting AS
      SELECT
        e.id                AS enrollment_id,
        c.title             AS course_name,
        u.name              AS participant_name,
        u.email             AS participant_email,
        e.enrolled_at,
        e.started_at,
        e.completed_at,
        e.time_spent_mins,
        e.status,
        cp.total_lessons,
        cp.completed_lessons,
        cp.completion_pct
      FROM enrollments e
      JOIN users   u  ON u.id = e.user_id
      JOIN courses c  ON c.id = e.course_id
      JOIN vw_course_progress cp ON cp.enrollment_id = e.id;
    `);

    // ─── FUNCTIONS ───────────────────────────────────────────────────────────
    await client.query(`
      CREATE OR REPLACE FUNCTION fn_set_updated_at()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$;
    `);

    await client.query(`
      CREATE OR REPLACE FUNCTION fn_award_quiz_points(
        p_user_id       UUID,
        p_quiz_id       UUID,
        p_enrollment_id UUID,
        p_correct       INTEGER,
        p_total         INTEGER
      )
      RETURNS INTEGER LANGUAGE plpgsql AS $$
      DECLARE
        v_attempt_no    INTEGER;
        v_points_earned INTEGER;
        v_passed        BOOLEAN;
        v_quiz          quizzes%ROWTYPE;
      BEGIN
        SELECT * INTO v_quiz FROM quizzes WHERE id = p_quiz_id;
        SELECT COUNT(*) + 1 INTO v_attempt_no
        FROM quiz_attempts WHERE user_id = p_user_id AND quiz_id = p_quiz_id;
        v_passed := (p_correct = p_total);
        IF v_passed THEN
          v_points_earned := CASE
            WHEN v_attempt_no = 1 THEN v_quiz.points_attempt_1
            WHEN v_attempt_no = 2 THEN v_quiz.points_attempt_2
            WHEN v_attempt_no = 3 THEN v_quiz.points_attempt_3
            ELSE                       v_quiz.points_attempt_4plus
          END;
        ELSE
          v_points_earned := 0;
        END IF;
        INSERT INTO quiz_attempts (
          user_id, quiz_id, enrollment_id,
          attempt_number, total_questions,
          correct_answers, points_earned, passed
        ) VALUES (
          p_user_id, p_quiz_id, p_enrollment_id,
          v_attempt_no, p_total,
          p_correct, v_points_earned, v_passed
        );
        IF v_points_earned > 0 THEN
          UPDATE users SET total_points = total_points + v_points_earned WHERE id = p_user_id;
        END IF;
        RETURN v_points_earned;
      END;
      $$;
    `);

    await client.query(`
      CREATE OR REPLACE FUNCTION fn_complete_lesson(
        p_user_id       UUID,
        p_lesson_id     UUID,
        p_enrollment_id UUID
      )
      RETURNS VOID LANGUAGE plpgsql AS $$
      DECLARE
        v_course_id UUID;
        v_total     INTEGER;
        v_done      INTEGER;
      BEGIN
        INSERT INTO lesson_progress (user_id, lesson_id, enrollment_id, is_completed, completed_at)
        VALUES (p_user_id, p_lesson_id, p_enrollment_id, TRUE, NOW())
        ON CONFLICT (user_id, lesson_id)
        DO UPDATE SET is_completed = TRUE, completed_at = NOW();

        UPDATE enrollments
        SET status = 'in_progress', started_at = COALESCE(started_at, NOW())
        WHERE id = p_enrollment_id AND status = 'not_started';

        SELECT course_id INTO v_course_id FROM enrollments WHERE id = p_enrollment_id;
        SELECT COUNT(*) INTO v_total FROM lessons WHERE course_id = v_course_id;
        SELECT COUNT(lp.*) INTO v_done
        FROM lesson_progress lp
        JOIN lessons l ON l.id = lp.lesson_id
        WHERE lp.user_id = p_user_id
          AND l.course_id = v_course_id
          AND lp.is_completed = TRUE;

        IF v_total > 0 AND v_done >= v_total THEN
          UPDATE enrollments SET status = 'completed', completed_at = NOW()
          WHERE id = p_enrollment_id;
        END IF;
      END;
      $$;
    `);

    // ─── TRIGGERS ────────────────────────────────────────────────────────────
    const triggers = [
      ['trg_users_updated_at',    'users'],
      ['trg_courses_updated_at',  'courses'],
      ['trg_lessons_updated_at',  'lessons'],
      ['trg_quizzes_updated_at',  'quizzes'],
      ['trg_reviews_updated_at',  'reviews'],
    ];
    for (const [name, table] of triggers) {
      await client.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_trigger WHERE tgname = '${name}'
          ) THEN
            CREATE TRIGGER ${name}
              BEFORE UPDATE ON ${table}
              FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
          END IF;
        END $$;
      `);
    }

    // ─── SEED: Default Admin ─────────────────────────────────────────────────
    await client.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Platform Admin', 'admin@learnova.com', 'REPLACE_WITH_BCRYPT_HASH', 'admin')
      ON CONFLICT (email) DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('✅ Learnova DB initialised — all tables, indexes, views, functions & triggers ready.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ initDB failed, transaction rolled back:', err.message);
    throw err;
  } finally {
    client.release();
  }
}