require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./src/routes');
const { errorHandler } = require('./src/middleware/errorHandler');
const { enforceRequestSafety } = require('./src/middleware/requestSecurity');
const prisma = require('./src/config/db');

const app = express();


app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(enforceRequestSafety);




app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});


app.use('/api', routes);


app.use(errorHandler);


const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, async () => {
    console.log(`Learnova server running on port ${PORT}`);

    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('PostgreSQL connected via Prisma');
    } catch (err) {
      console.error('PostgreSQL connection failed:', err.message);
    }
  });
}

module.exports = app;
