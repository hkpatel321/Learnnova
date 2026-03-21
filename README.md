# LearnNova

Stripe test payment processing is now wired into paid courses.

## Demo setup

1. Copy [backend/.env.example](./backend/.env.example) to `backend/.env`.
2. Add your Stripe test credentials:
   `STRIPE_SECRET_KEY`
   `STRIPE_PUBLISHABLE_KEY`
   Optional: `STRIPE_CURRENCY` (defaults to `INR`)
3. Apply the Prisma payment migrations from:
   [backend/prisma/migrations/20260322000000_add_payments/migration.sql](./backend/prisma/migrations/20260322000000_add_payments/migration.sql)
   [backend/prisma/migrations/20260322010000_add_stripe_provider/migration.sql](./backend/prisma/migrations/20260322010000_add_stripe_provider/migration.sql)
4. Start backend and frontend.
5. Log in as a learner, open a paid published course, and click the Stripe payment CTA.
6. Complete checkout with Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC, and any ZIP/postal code.

## What the demo shows

- A Stripe Checkout Session is created server-side.
- The returning Checkout Session is verified before access is granted.
- The learner is enrolled automatically after successful verification.
- Successful Stripe test payments appear in the learner `My Courses` sidebar under `Recent Payments`.
