import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb } from './db/database.js';
import { seedDatabase } from './db/seed.js';
import subjectsRouter from './routes/subjects.js';
import topicsRouter from './routes/topics.js';
import tasksRouter from './routes/tasks.js';
import sessionsRouter from './routes/sessions.js';
import progressRouter from './routes/progress.js';
import agentRouter from './routes/agent.js';
import settingsRouter from './routes/settings.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Init DB
const db = initDb();
seedDatabase(db);

// Attach db to all requests
app.use((req, _res, next) => {
  req.db = db;
  next();
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), demoMode: !process.env.GEMINI_API_KEY });
});

// Routes
app.use('/api/subjects', subjectsRouter);
app.use('/api/topics', topicsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/progress', progressRouter);
app.use('/api/agent', agentRouter);
app.use('/api/settings', settingsRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  const mode = process.env.GEMINI_API_KEY ? 'AI mode (Gemini)' : 'Demo mode';
  console.log(`🚀 StudyPilot server running on port ${PORT} — ${mode}`);
});

export default app;
