import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const router = Router();
const SubjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().default(''),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default('#6366f1'),
});

router.get('/', (req, res) => {
  const subjects = req.db.getAll('subjects').sort((a, b) => a.name.localeCompare(b.name));
  res.json({ success: true, data: subjects });
});

router.get('/:id', (req, res) => {
  const subject = req.db.getOne('subjects', r => r.id === req.params.id);
  if (!subject) return res.status(404).json({ success: false, error: 'Subject not found' });
  res.json({ success: true, data: subject });
});

router.post('/', validate(SubjectSchema), (req, res) => {
  const { name, description, color } = req.body;
  const subject = { id: uuidv4(), name, description, color };
  req.db.insert('subjects', subject);
  res.status(201).json({ success: true, data: req.db.getOne('subjects', r => r.id === subject.id) });
});

router.put('/:id', validate(SubjectSchema), (req, res) => {
  const { name, description, color } = req.body;
  const updated = req.db.update('subjects', req.params.id, { name, description, color });
  if (!updated) return res.status(404).json({ success: false, error: 'Subject not found' });
  res.json({ success: true, data: updated });
});

router.delete('/:id', (req, res) => {
  const deleted = req.db.delete('subjects', req.params.id);
  if (deleted === 0) return res.status(404).json({ success: false, error: 'Subject not found' });
  // Cascade delete topics, tasks, sessions
  req.db.deleteWhere('topics', r => r.subject_id === req.params.id);
  req.db.deleteWhere('tasks', r => r.subject_id === req.params.id);
  req.db.deleteWhere('study_sessions', r => r.subject_id === req.params.id);
  res.json({ success: true, message: 'Subject deleted' });
});

export default router;
