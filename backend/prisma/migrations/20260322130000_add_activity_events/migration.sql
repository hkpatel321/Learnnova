CREATE TYPE "ActivityType" AS ENUM (
    'video_watch',
    'quiz_attempt',
    'document_open',
    'document_download',
    'image_view',
    'image_download'
);

CREATE TABLE "activity_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "course_id" TEXT,
    "lesson_id" TEXT,
    "activity_type" "ActivityType" NOT NULL,
    "event_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "activity_events_user_id_event_date_idx" ON "activity_events"("user_id", "event_date");
CREATE INDEX "activity_events_course_id_idx" ON "activity_events"("course_id");
CREATE INDEX "activity_events_lesson_id_idx" ON "activity_events"("lesson_id");

ALTER TABLE "activity_events"
ADD CONSTRAINT "activity_events_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "activity_events"
ADD CONSTRAINT "activity_events_course_id_fkey"
FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "activity_events"
ADD CONSTRAINT "activity_events_lesson_id_fkey"
FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
