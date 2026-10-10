import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const router = Router();

const TaskSchema = z.object({
  title: z.string().min(1).max(200),
  subject_id: z.string().uuid(),
  topic_id: z.string().uuid().optional().nullable(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Deadline must be YYYY-MM-DD'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  estimated_hours: z.number().min(0.5).max(100).default(2),
  status: z.enum(['pending', 'in_progress', 'completed']).default('pending'),
  notes: z.string().max(1000).optional().default(''),
});

function enrichTask(task, db) {
  const subject = db.getOne('subjects', s => s.id === task.subject_id);
  return { ...task, subject_name: subject?.name || '', subject_color: subject?.color || '#6366f1' };
}

router.get('/', (req, res) => {
  const { status, subject_id, priority } = req.query;
  let tasks = req.db.getAll('tasks', t => {
    if (status && t.status !== status) return false;
    if (subject_id && t.subject_id !== subject_id) return false;
    if (priority && t.priority !== priority) return false;
    return true;
  });
  tasks = tasks.map(t => enrichTask(t, req.db)).sort((a, b) => {
    if (a.deadline !== b.deadline) return a.deadline.localeCompare(b.deadline);
    const po = { critical: 0, high: 1, medium: 2, low: 3 };
    return (po[a.priority] || 2) - (po[b.priority] || 2);
  });
  res.json({ success: true, data: tasks });
});

router.get('/:id', (req, res) => {
  const task = req.db.getOne('tasks', t => t.id === req.params.id);
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
  res.json({ success: true, data: enrichTask(task, req.db) });
});

router.post('/', validate(TaskSchema), (req, res) => {
  if (!req.db.getOne('subjects', s => s.id === req.body.subject_id)) {
    return res.status(404).json({ success: false, error: 'Subject not found' });
  }
  const task = { id: uuidv4(), ...req.body };
  req.db.insert('tasks', task);
  res.status(201).json({ success: true, data: enrichTask(task, req.db) });
});

router.put('/:id', validate(TaskSchema.partial()), (req, res) => {
  const existing = req.db.getOne('tasks', t => t.id === req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: 'Task not found' });
  const updated = req.db.update('tasks', req.params.id, req.body);
  res.json({ success: true, data: enrichTask(updated, req.db) });
});

router.patch('/:id/status', (req, res) => {
  const Schema = z.object({ status: z.enum(['pending', 'in_progress', 'completed']) });
  const result = Schema.safeParse(req.body);
  if (!result.success) return res.status(422).json({ success: false, error: 'Invalid status' });
  const updated = req.db.update('tasks', req.params.id, { status: result.data.status });
  if (!updated) return res.status(404).json({ success: false, error: 'Task not found' });
  res.json({ success: true, message: 'Task status updated' });
});

router.delete('/:id', (req, res) => {
  const deleted = req.db.delete('tasks', req.params.id);
  if (deleted === 0) return res.status(404).json({ success: false, error: 'Task not found' });
  res.json({ success: true, message: 'Task deleted' });
});

export default router;
