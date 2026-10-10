import { z } from 'zod';

/**
 * Middleware factory: validates req.body against a Zod schema.
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(422).json({
        success: false,
        error: 'Validation failed',
        details: result.error.flatten(),
      });
    }
    req.body = result.data;
    next();
  };
}

// ─── Shared Schemas ────────────────────────────────────────────────
export const priorityEnum = z.enum(['low', 'medium', 'high', 'critical']);
export const statusEnum = z.enum(['pending', 'in_progress', 'completed']);
export const difficultyEnum = z.enum(['easy', 'medium', 'hard']);
export const sessionStatusEnum = z.enum(['scheduled', 'completed', 'missed', 'skipped']);
