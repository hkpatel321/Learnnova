require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('admin123', 12);

  await prisma.user.upsert({
    where: { email: 'admin@learnova.com' },
    update: {},
    create: {
      name: 'Platform Admin',
      email: 'admin@learnova.com',
      passwordHash: hash,
      role: 'admin',
    },
  });

  await prisma.user.upsert({
    where: { email: 'instructor@learnova.com' },
    update: {},
    create: {
      name: 'Demo Instructor',
      email: 'instructor@learnova.com',
      passwordHash: await bcrypt.hash('instructor123', 12),
      role: 'instructor',
    },
  });

  await prisma.user.upsert({
    where: { email: 'learner@learnova.com' },
    update: {},
    create: {
      name: 'Demo Learner',
      email: 'learner@learnova.com',
      passwordHash: await bcrypt.hash('learner123', 12),
      role: 'learner',
    },
  });

  console.log('Seed complete. Demo users created.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
