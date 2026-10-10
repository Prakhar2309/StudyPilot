import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const router = Router();
const SettingsSchema = z.object({
  daily_hours: z.number().min(1).max(18).optional(),
  timezone: z.string().max(50).optional(),
  study_start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  study_end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  break_duration: z.number().int().min(0).max(60).optional(),
});

router.get('/', (req, res) => {
  const settings = req.db.getOne('student_settings', r => r.id === 'default') || {
    id: 'default', daily_hours: 6, timezone: 'Asia/Kolkata',
    study_start_time: '09:00', study_end_time: '22:00', break_duration: 15,
  };
  res.json({ success: true, data: settings });
});

router.put('/', validate(SettingsSchema), (req, res) => {
  const existing = req.db.getOne('student_settings', r => r.id === 'default');
  if (existing) {
    const updated = req.db.update('student_settings', 'default', req.body);
    res.json({ success: true, data: updated });
  } else {
    const settings = { id: 'default', daily_hours: 6, timezone: 'Asia/Kolkata', study_start_time: '09:00', study_end_time: '22:00', break_duration: 15, ...req.body };
    req.db.insert('student_settings', settings);
    res.json({ success: true, data: settings });
  }
});

export default router;
