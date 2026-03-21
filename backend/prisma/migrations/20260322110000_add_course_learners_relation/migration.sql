CREATE TABLE "course_learners" (
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_learners_pkey" PRIMARY KEY ("user_id","course_id")
);

CREATE INDEX "course_learners_user_id_idx" ON "course_learners"("user_id");

CREATE INDEX "course_learners_course_id_idx" ON "course_learners"("course_id");

ALTER TABLE "course_learners"
ADD CONSTRAINT "course_learners_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "course_learners"
ADD CONSTRAINT "course_learners_course_id_fkey"
FOREIGN KEY ("course_id") REFERENCES "courses"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "course_learners" ("user_id", "course_id", "linked_at")
SELECT
  "user_id",
  "course_id",
  COALESCE("enrolled_at", CURRENT_TIMESTAMP)
FROM "enrollments"
ON CONFLICT ("user_id", "course_id") DO NOTHING;
