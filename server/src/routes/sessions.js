import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const router = Router();

const SessionSchema = z.object({
  task_id: z.string().uuid().optional().nullable(),
  topic_id: z.string().uuid().optional().nullable(),
  subject_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  duration_minutes: z.number().int().min(15).max(480).default(60),
  status: z.enum(['scheduled', 'completed', 'missed', 'skipped']).default('scheduled'),
  notes: z.string().max(1000).optional().default(''),
});

function enrichSession(session, db) {
  const subject = db.getOne('subjects', s => s.id === session.subject_id);
  const task = session.task_id ? db.getOne('tasks', t => t.id === session.task_id) : null;
  return { ...session, subject_name: subject?.name || '', subject_color: subject?.color || '#6366f1', task_title: task?.title || null };
}

router.get('/', (req, res) => {
  const { date, status, subject_id } = req.query;
  let sessions = req.db.getAll('study_sessions', s => {
    if (date && s.session_date !== date) return false;
    if (status && s.status !== status) return false;
    if (subject_id && s.subject_id !== subject_id) return false;
    return true;
  });
  sessions = sessions.map(s => enrichSession(s, req.db))
    .sort((a, b) => a.session_date.localeCompare(b.session_date) || a.start_time.localeCompare(b.start_time));
  res.json({ success: true, data: sessions });
});

router.get('/today', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const sessions = req.db.getAll('study_sessions', s => s.session_date === today)
    .map(s => enrichSession(s, req.db))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  res.json({ success: true, data: sessions });
});

router.post('/', validate(SessionSchema), (req, res) => {
  const session = { id: uuidv4(), ...req.body };
  req.db.insert('study_sessions', session);
  res.status(201).json({ success: true, data: enrichSession(session, req.db) });
});

router.patch('/:id/status', (req, res) => {
  const Schema = z.object({ status: z.enum(['scheduled', 'completed', 'missed', 'skipped']), notes: z.string().optional() });
  const result = Schema.safeParse(req.body);
  if (!result.success) return res.status(422).json({ success: false, error: 'Invalid status' });
  const existing = req.db.getOne('study_sessions', s => s.id === req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: 'Session not found' });
  req.db.update('study_sessions', req.params.id, { status: result.data.status, notes: result.data.notes || existing.notes });
  res.json({ success: true, message: 'Session status updated' });
});

router.delete('/:id', (req, res) => {
  const deleted = req.db.delete('study_sessions', req.params.id);
  if (deleted === 0) return res.status(404).json({ success: false, error: 'Session not found' });
  res.json({ success: true, message: 'Session deleted' });
});

router.delete('/bulk/scheduled', (req, res) => {
  const deleted = req.db.deleteWhere('study_sessions', s => s.status === 'scheduled');
  res.json({ success: true, deleted });
});

export default router;
