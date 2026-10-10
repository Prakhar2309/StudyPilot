import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const router = Router();
const TopicSchema = z.object({
  subject_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  estimated_hours: z.number().min(0.5).max(100).default(2),
  completed: z.boolean().default(false),
  notes: z.string().max(1000).optional().default(''),
});

function enrichTopic(topic, db) {
  const subject = db.getOne('subjects', s => s.id === topic.subject_id);
  return { ...topic, subject_name: subject?.name || '', subject_color: subject?.color || '#6366f1' };
}

router.get('/', (req, res) => {
  const { subject_id } = req.query;
  let topics = req.db.getAll('topics', subject_id ? t => t.subject_id === subject_id : null);
  topics = topics.map(t => enrichTopic(t, req.db)).sort((a, b) => a.title.localeCompare(b.title));
  res.json({ success: true, data: topics });
});

router.get('/:id', (req, res) => {
  const topic = req.db.getOne('topics', t => t.id === req.params.id);
  if (!topic) return res.status(404).json({ success: false, error: 'Topic not found' });
  res.json({ success: true, data: enrichTopic(topic, req.db) });
});

router.post('/', validate(TopicSchema), (req, res) => {
  const { subject_id, title, difficulty, estimated_hours, completed, notes } = req.body;
  if (!req.db.getOne('subjects', s => s.id === subject_id)) {
    return res.status(404).json({ success: false, error: 'Subject not found' });
  }
  const topic = { id: uuidv4(), subject_id, title, difficulty, estimated_hours, completed, notes };
  req.db.insert('topics', topic);
  res.status(201).json({ success: true, data: enrichTopic(topic, req.db) });
});

router.put('/:id', validate(TopicSchema.partial()), (req, res) => {
  const existing = req.db.getOne('topics', t => t.id === req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: 'Topic not found' });
  const updated = req.db.update('topics', req.params.id, req.body);
  res.json({ success: true, data: enrichTopic(updated, req.db) });
});

router.patch('/:id/complete', (req, res) => {
  const existing = req.db.getOne('topics', t => t.id === req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: 'Topic not found' });
  req.db.update('topics', req.params.id, { completed: !!req.body.completed });
  res.json({ success: true, message: 'Topic completion updated' });
});

router.delete('/:id', (req, res) => {
  const deleted = req.db.delete('topics', req.params.id);
  if (deleted === 0) return res.status(404).json({ success: false, error: 'Topic not found' });
  res.json({ success: true, message: 'Topic deleted' });
});

export default router;
