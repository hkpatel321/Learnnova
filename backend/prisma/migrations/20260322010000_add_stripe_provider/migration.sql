ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'stripe';

ALTER TABLE "payments"
ALTER COLUMN "provider" SET DEFAULT 'stripe';
