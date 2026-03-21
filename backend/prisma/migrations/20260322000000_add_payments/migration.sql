CREATE TYPE "PaymentProvider" AS ENUM ('razorpay');

CREATE TYPE "PaymentStatus" AS ENUM ('created', 'verified', 'failed');

CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "enrollment_id" TEXT,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'razorpay',
    "status" "PaymentStatus" NOT NULL DEFAULT 'created',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "amount" DECIMAL(10,2) NOT NULL,
    "receipt" TEXT,
    "provider_order_id" TEXT NOT NULL,
    "provider_payment_id" TEXT,
    "provider_signature" TEXT,
    "provider_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payments_provider_order_id_key" ON "payments"("provider_order_id");

CREATE UNIQUE INDEX "payments_provider_payment_id_key" ON "payments"("provider_payment_id");

ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT "payments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT "payments_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
