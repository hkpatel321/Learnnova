# LearnNova

<div align="center">

Production-ready full-stack eLearning platform with role-based access, course authoring, learner progress, quizzes, invitations, reviews, reporting, password reset, uploads, and Stripe-powered paid enrollments.

</div>

---

## Why This README Feels Interactive

This README is designed for fast navigation and progressive disclosure:

- jump straight to high-signal sections from the link bar above
- expand only the sections you need using collapsible blocks
- use copy-ready commands and environment templates directly
- skim architecture and capabilities before diving into operations

---

## Project Snapshot

| Area | Details |
|---|---|
| Product | LearnNova eLearning platform |
| Frontend | React 19, Vite 8, React Router 7, Zustand, TanStack Query, Tailwind CSS 4 |
| Backend | Express 4, Prisma 6, PostgreSQL, JWT, Nodemailer, Multer |
| Payments | Stripe Checkout |
| Auth | Access + refresh token JWT flow |
| Storage | PostgreSQL + local upload directory |
| Roles | `admin`, `instructor`, `learner` |
| Apps | `frontend/` and `backend/` |

## Quick Start

<details open>
<summary><strong>1. Install dependencies</strong></summary>

```bash
npm install --prefix backend
npm install --prefix frontend
```

</details>

<details open>
<summary><strong>2. Create backend environment file</strong></summary>

Create `backend/.env` and fill it using the template in the Environment Setup section below.

</details>

<details open>
<summary><strong>3. Run database migrations</strong></summary>

```bash
cd backend
npx prisma migrate deploy
```

For local iterative development:

```bash
npx prisma migrate dev
```

</details>

<details open>
<summary><strong>4. Seed demo data</strong></summary>

```bash
cd backend
npx prisma db seed
```

</details>

<details open>
<summary><strong>5. Start both apps</strong></summary>

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

</details>

### Local URLs

- frontend: `http://localhost:5173`
- backend: `http://localhost:5000`
- health check: `http://localhost:5000/api/health`

---

## Feature Tour

<details open>
<summary><strong>Public experience</strong></summary>

- browse a public course catalog
- open course detail pages by id, slug, or identifier path
- register, log in, request password reset, and accept course invitations

</details>

<details>
<summary><strong>Learner experience</strong></summary>

- enroll in open courses
- access invitation-only courses after acceptance
- purchase paid courses through Stripe Checkout
- consume video, document, image, and quiz lessons
- track lesson completion and course progress
- review courses and manage profile details
- inspect personal activity heatmap data

</details>

<details>
<summary><strong>Instructor and admin experience</strong></summary>

- create, update, publish, and manage courses
- upload course cover images
- author structured lesson content
- create quizzes with questions and answer options
- inspect reporting data and course-level stats
- perform role-protected administrative actions

</details>

<details>
<summary><strong>Platform capabilities</strong></summary>

- JWT authentication with refresh flow
- Prisma-backed relational data model
- SMTP email delivery for reset, invitation, contact, and purchase emails
- file upload handling for media assets
- Stripe Checkout integration for paid enrollments
- seeded demo environment for rapid testing

</details>

---

## Repository Map

```text
.
|-- backend/
|   |-- prisma/
|   |   |-- migrations/
|   |   |-- schema.prisma
|   |   `-- seed.js
|   |-- src/
|   |   |-- config/
|   |   |-- controllers/
|   |   |-- middleware/
|   |   |-- routes/
|   |   `-- utils/
|   |-- package.json
|   `-- server.js
|-- frontend/
|   |-- public/
|   |-- src/
|   |   |-- assets/
|   |   |-- components/
|   |   |-- lib/
|   |   |-- pages/
|   |   |-- router/
|   |   `-- store/
|   |-- package.json
|   `-- vite.config.js
`-- README.md
```

### Important entry points

- backend app entry: `backend/server.js`
- Prisma schema: `backend/prisma/schema.prisma`
- seed script: `backend/prisma/seed.js`
- frontend router: `frontend/src/router/AppRouter.jsx`
- frontend API client: `frontend/src/lib/axios.js`

---

## Architecture

<details open>
<summary><strong>Frontend architecture</strong></summary>

The frontend is a React SPA with route groups for public, learner, and backoffice flows.

Primary frontend concerns:

- route protection using auth state and role checks
- relative API access through Vite proxying in development
- token injection and automatic refresh through Axios interceptors
- UI composition through reusable components, layouts, and page modules

</details>

<details open>
<summary><strong>Backend architecture</strong></summary>

The backend is an Express application organized by feature:

- `controllers`: business logic and orchestration
- `routes`: endpoint declarations and validation wiring
- `middleware`: auth, validation, request safety, errors, uploads
- `utils`: supporting domain helpers such as email delivery and access logic
- `prisma`: schema, migrations, and seed generation

Runtime behavior includes:

- Helmet security headers
- CORS restricted by `FRONTEND_URL`
- JSON and URL-encoded body parsing with size limits
- route mounting under `/api`
- upload serving under `/uploads`
- health endpoint under `/api/health`

</details>

<details>
<summary><strong>Data model overview</strong></summary>

Core entities present in the Prisma schema:

- `User`
- `Course`
- `Lesson`
- `LessonAttachment`
- `Quiz`
- `QuizQuestion`
- `QuizOption`
- `Enrollment`
- `CourseLearner`
- `LessonProgress`
- `QuizAttempt`
- `QuizAttemptAnswer`
- `Review`
- `CourseInvitation`
- `Payment`
- `ActivityEvent`

Important business rules:

- users are role-scoped as `admin`, `instructor`, or `learner`
- courses can be `open`, `invitation`, or `payment` access-controlled
- enrollment and review uniqueness are enforced per learner-course pair
- payment verification can create or update linked enrollments

</details>

---

## Environment Setup

<details open>
<summary><strong>Backend .env template</strong></summary>

```env
NODE_ENV=development
PORT=5000

DATABASE_URL=postgresql://postgres:password@localhost:5432/learnova

FRONTEND_URL=http://localhost:5173
RESET_PASSWORD_URL=http://localhost:5173/reset-password

JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=replace-with-a-different-long-random-secret
JWT_REFRESH_EXPIRES_IN=7d

STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_CURRENCY=INR

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notifications@example.com
SMTP_PASS=replace-with-smtp-password
MAIL_FROM=LearnNova <notifications@example.com>

APP_NAME=Learnova
```

</details>

<details>
<summary><strong>Environment variable reference</strong></summary>

| Variable | Required | Purpose |
|---|---|---|
| `NODE_ENV` | No | Enables development-oriented Prisma and error behavior |
| `PORT` | No | Backend port, defaults to `5000` |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma |
| `FRONTEND_URL` | Yes | CORS origin and callback base URL |
| `RESET_PASSWORD_URL` | No | Explicit password reset frontend route override |
| `JWT_SECRET` | Yes | Access token signing secret |
| `JWT_EXPIRES_IN` | No | Access token lifetime, default `15m` |
| `JWT_REFRESH_SECRET` | Yes | Refresh token signing secret |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh token lifetime, default `7d` |
| `STRIPE_SECRET_KEY` | Yes for paid flows | Backend Stripe API credential |
| `STRIPE_PUBLISHABLE_KEY` | Recommended for paid flows | Returned to frontend on payment initiation |
| `STRIPE_CURRENCY` | No | Defaults to `INR` |
| `SMTP_HOST` | Yes for email flows | SMTP hostname |
| `SMTP_PORT` | Yes for email flows | SMTP port |
| `SMTP_SECURE` | No | `true` for SMTPS, otherwise `false` |
| `SMTP_USER` | Yes for email flows | SMTP username |
| `SMTP_PASS` | Yes for email flows | SMTP password |
| `MAIL_FROM` | No | Sender override |
| `APP_NAME` | No | Branding used in emails |

</details>

<details>
<summary><strong>Setup notes</strong></summary>

- the frontend does not currently require its own API env file for local development
- Vite proxies `/api` and `/uploads` to the backend on port `5000`
- if frontend and backend are deployed on different domains, update backend CORS and callback URLs accordingly

</details>

---

## Local Development

<details open>
<summary><strong>Backend commands</strong></summary>

```bash
cd backend
npm run dev
npm start
npx prisma generate
npx prisma studio
npx prisma migrate dev
npx prisma migrate deploy
npx prisma db seed
```

</details>

<details open>
<summary><strong>Frontend commands</strong></summary>

```bash
cd frontend
npm run dev
npm run build
npm run preview
npm run lint
```

</details>

<details>
<summary><strong>Development networking</strong></summary>

Vite proxies:

- `/api` -> `http://localhost:5000`
- `/uploads` -> `http://localhost:5000`

This allows the frontend to use relative API paths during local development.

</details>

---

## Database and Seed Data

<details open>
<summary><strong>What the seed script creates</strong></summary>

- admin, instructor, and learner users
- a broad demo course catalog
- lesson trees with videos and resource-based media
- quizzes, quiz questions, and options
- invitation records
- learner enrollments across multiple states
- verified payments for payment-locked courses
- progress, attempts, reviews, and learner links

</details>

<details open>
<summary><strong>Seeded credentials</strong></summary>

- admin: `admin@learnova.com` / `admin123`
- instructor: `instructor@learnova.com` / `instructor123`
- learner: `learner@learnova.com` / `learner123`

These are for local/demo use only.

</details>

<details>
<summary><strong>Database workflow commands</strong></summary>

Apply migrations:

```bash
cd backend
npx prisma migrate deploy
```

Open Prisma Studio:

```bash
cd backend
npx prisma studio
```

Reseed local data:

```bash
cd backend
npx prisma db seed
```

</details>

---

## Authentication and Authorization

<details open>
<summary><strong>Authentication flow</strong></summary>

- backend issues access and refresh JWTs
- access tokens default to `15m`
- refresh tokens default to `7d`
- frontend stores tokens in `localStorage`
- Axios attempts token refresh on eligible `401` responses
- failing refresh clears session state and redirects to `/login`

</details>

<details>
<summary><strong>Role model</strong></summary>

- `learner`: content consumption, progress, reviews, payments, profile
- `instructor`: course creation and operational management
- `admin`: elevated governance, including destructive course deletion

</details>

<details>
<summary><strong>Current security implications</strong></summary>

The current implementation works for typical SPA flows, but production environments with stricter security requirements may prefer:

- HTTP-only cookies instead of `localStorage`
- refresh token rotation with revocation tracking
- rate limiting on auth endpoints

</details>

---

## Payments

<details open>
<summary><strong>How payments work</strong></summary>

- only courses with `accessRule = payment` can be purchased
- backend creates Stripe Checkout sessions directly
- payment records are created with status lifecycle tracking
- verification confirms Stripe session state
- successful verification creates or updates a paid enrollment
- purchase confirmation email is sent after verification

</details>

<details>
<summary><strong>Required configuration</strong></summary>

- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_CURRENCY` optional, defaults to `INR`

</details>

<details>
<summary><strong>Production note</strong></summary>

The repository currently verifies payment after the frontend returns with a Checkout `session_id`. A webhook-based Stripe confirmation flow is not present yet and should be added for stronger production reliability.

</details>

---

## Email Delivery

<details open>
<summary><strong>Transactional email flows</strong></summary>

- password reset email
- course invitation email
- learner contact email
- purchase confirmation email

</details>

<details>
<summary><strong>SMTP requirements</strong></summary>

You need these values configured for email-enabled flows:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

Optional:

- `SMTP_SECURE`
- `MAIL_FROM`
- `APP_NAME`

</details>

---

## Uploads and Static Assets

<details open>
<summary><strong>Upload behavior</strong></summary>

- upload directory is created automatically under the backend app
- files are saved with UUID filenames
- image uploads are validated by extension and MIME family
- upload size limit is `5 MB`
- backend exposes uploaded assets at `/uploads`

</details>

<details>
<summary><strong>Production recommendation</strong></summary>

Local-disk uploads are fine for development and simple single-instance deployments. For scalable production environments, move uploads to an object storage provider such as S3, GCS, or Azure Blob Storage.

</details>

---

## API Overview

<details open>
<summary><strong>Base and health routes</strong></summary>

- base path: `/api`
- health check: `GET /api/health`

</details>

<details open>
<summary><strong>Auth endpoints</strong></summary>

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `POST /api/auth/logout`

</details>

<details>
<summary><strong>Course endpoints</strong></summary>

- `GET /api/courses/catalog`
- `GET /api/courses/lookup/:identifier/detail`
- `GET /api/courses/:id/detail`
- `POST /api/courses`
- `GET /api/courses`
- `GET /api/courses/:id`
- `PUT /api/courses/:id`
- `PATCH /api/courses/:id/publish`
- `DELETE /api/courses/:id`
- `POST /api/courses/:id/cover`

</details>

<details>
<summary><strong>Payment endpoints</strong></summary>

- `POST /api/courses/:courseId/payment/order`
- `POST /api/courses/:courseId/payment/verify`
- `GET /api/payments/me`

</details>

<details>
<summary><strong>Other backend feature groups present in the repo</strong></summary>

- lessons
- quizzes
- enrollments
- progress
- reviews
- reporting
- user profile
- learner activity heatmap

For exact payloads and validation rules, inspect the route and controller files in `backend/src/routes` and `backend/src/controllers`.

</details>

---

## Production Deployment

<details open>
<summary><strong>Recommended topology</strong></summary>

- serve `frontend` as a static SPA
- run `backend` as a Node.js API service
- use managed PostgreSQL
- use managed SMTP/email infrastructure
- use Stripe live credentials in production
- prefer object storage over local upload disk

</details>

<details open>
<summary><strong>Backend deployment checklist</strong></summary>

- set environment variables
- run `npm ci`
- run `npx prisma generate`
- run `npx prisma migrate deploy`
- start with `npm start`
- ensure outbound access to PostgreSQL, Stripe, and SMTP
- persist or externalize `/uploads`
- configure `FRONTEND_URL` to the real frontend origin

</details>

<details open>
<summary><strong>Frontend deployment checklist</strong></summary>

- run `npm ci`
- run `npm run build`
- serve the built static bundle
- ensure frontend traffic can reach backend `/api`
- if split across domains, review CORS and callback URLs carefully

</details>

<details>
<summary><strong>Reverse proxy considerations</strong></summary>

Typical deployment pattern:

- frontend: `https://app.example.com`
- backend: `https://api.example.com`

When using split domains, verify:

- CORS origin configuration
- reset-password links
- invitation acceptance links
- payment success and cancel URLs
- uploaded asset routing

</details>

---

## Operational Notes

<details open>
<summary><strong>Security controls already present</strong></summary>

- Helmet enabled
- CORS origin restriction via `FRONTEND_URL`
- request body size limits
- route-level validation with `express-validator`
- JWT authentication middleware
- selected request safety enforcement for unknown fields

</details>

<details>
<summary><strong>Known operational gaps</strong></summary>

- no webhook-based Stripe reconciliation yet
- no automated test suite present in the repository
- no Docker or Compose files currently included
- auth tokens live in `localStorage`
- uploads use local disk
- no visible centralized logging, metrics, or tracing stack
- no built-in rate limiting layer visible in the current codebase

</details>

---

## Troubleshooting

<details open>
<summary><strong>Frontend cannot reach backend</strong></summary>

Check:

- backend is running on `http://localhost:5000`
- frontend is running on `http://localhost:5173`
- Vite proxy is active
- backend `FRONTEND_URL` matches your frontend origin

</details>

<details>
<summary><strong>Database connection fails</strong></summary>

Check:

- PostgreSQL is running
- `DATABASE_URL` is valid
- migrations have been applied
- the DB user has sufficient privileges

</details>

<details>
<summary><strong>Password reset emails do not send</strong></summary>

Check:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS`
- sender configuration accepted by your SMTP provider
- outbound network access from the backend host

</details>

<details>
<summary><strong>Paid purchase flow fails</strong></summary>

Check:

- the course is published
- the course access rule is `payment`
- the course has a valid price
- Stripe credentials are present and valid
- backend can reach `api.stripe.com`

</details>

<details>
<summary><strong>Uploads are missing</strong></summary>

Check:

- files exist in the backend upload directory
- `/uploads` is being served by the backend or proxy
- your production host persists uploaded files

</details>

---

## Production Hardening Roadmap

<details open>
<summary><strong>Recommended next improvements</strong></summary>

- add Stripe webhook verification and reconciliation
- move auth to HTTP-only cookies if your security posture requires it
- add refresh token rotation and revocation persistence
- move uploads to object storage
- introduce structured logging and metrics
- add rate limiting and abuse protection
- add automated tests for auth, payment, progress, and reporting flows
- add CI/CD validation for lint, build, migrations, and smoke checks
- add startup-time environment validation

</details>

---

## Maintainer Notes

This README was written against the current repository structure and actual implementation details in the codebase, not from generic boilerplate assumptions. If you want to push the interactivity further, the next step would be adding:

- architecture diagrams
- request flow diagrams
- screenshots or GIF walkthroughs
- API examples with expandable request/response samples
- a badge block for health, build, license, and deployment state

## Demo Video Link

<p>
  <a href="https://drive.google.com/drive/folders/1zaFijEZgYyxCVmsag9IR9gy34OGPj6Yc">Learnnova</a>
</p>
