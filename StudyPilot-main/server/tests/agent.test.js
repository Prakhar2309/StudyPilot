import { executeTool } from '../src/agent/tools.js';
import { initDb } from '../src/db/database.js';

// Use temp file for tests
import os from 'os';
import path from 'path';
import fs from 'fs';

const tempDir = os.tmpdir();
const testDbPath = path.join(tempDir, `studypilot-test-${Date.now()}.json`);
process.env.DB_PATH = testDbPath;

let db;

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

beforeAll(() => {
  db = initDb();
  // Seed test data
  db.insert('student_settings', { id: 'default', daily_hours: 6, study_start_time: '09:00', study_end_time: '22:00', break_duration: 15 });
  db.insert('subjects', { id: 'subject-dsa', name: 'Data Structures', description: '', color: '#6366f1' });
  db.insert('subjects', { id: 'subject-dbms', name: 'DBMS', description: '', color: '#10b981' });
  db.insert('tasks', { id: 'task-001', title: 'DSA Exam Prep', subject_id: 'subject-dsa', topic_id: null, deadline: addDays(2), priority: 'critical', estimated_hours: 5, status: 'pending', notes: '' });
  db.insert('tasks', { id: 'task-002', title: 'DBMS Assignment', subject_id: 'subject-dbms', topic_id: null, deadline: addDays(5), priority: 'high', estimated_hours: 3, status: 'in_progress', notes: '' });
  db.insert('tasks', { id: 'task-003', title: 'Low Priority Reading', subject_id: 'subject-dsa', topic_id: null, deadline: addDays(10), priority: 'low', estimated_hours: 1, status: 'pending', notes: '' });
  db.insert('tasks', { id: 'task-004', title: 'Completed Task', subject_id: 'subject-dbms', topic_id: null, deadline: addDays(-1), priority: 'medium', estimated_hours: 2, status: 'completed', notes: '' });
  db.insert('topics', { id: 'topic-001', subject_id: 'subject-dsa', title: 'Binary Trees', difficulty: 'hard', estimated_hours: 4, completed: false, notes: '' });
  db.insert('topics', { id: 'topic-002', subject_id: 'subject-dbms', title: 'SQL Basics', difficulty: 'easy', estimated_hours: 2, completed: true, notes: '' });
});

afterAll(() => {
  try { fs.unlinkSync(testDbPath); } catch (e) {}
});

// ─── get_student_context ──────────────────────────────────────────
describe('Tool: get_student_context', () => {
  test('returns subjects, tasks, settings', async () => {
    const r = await executeTool(db, 'get_student_context', {});
    expect(r.success).toBe(true);
    expect(r.result.subjects.length).toBeGreaterThan(0);
    expect(r.result.tasks.total_incomplete).toBeGreaterThan(0);
    expect(r.result.settings).toBeDefined();
    expect(r.result.daily_study_hours).toBeGreaterThan(0);
  });
});

// ─── prioritize_tasks ─────────────────────────────────────────────
describe('Tool: prioritize_tasks', () => {
  test('ranks tasks by urgency score — critical/soon first', async () => {
    const r = await executeTool(db, 'prioritize_tasks', { include_completed: false });
    expect(r.success).toBe(true);
    const tasks = r.result.ranked_tasks;
    expect(tasks.length).toBeGreaterThan(0);
    const dsaIndex = tasks.findIndex(t => t.id === 'task-001');
    const lowIndex = tasks.findIndex(t => t.id === 'task-003');
    expect(dsaIndex).toBeLessThan(lowIndex);
  });

  test('excludes completed tasks by default', async () => {
    const r = await executeTool(db, 'prioritize_tasks', { include_completed: false });
    expect(r.success).toBe(true);
    expect(r.result.ranked_tasks.filter(t => t.status === 'completed')).toHaveLength(0);
  });

  test('includes completed when requested', async () => {
    const r = await executeTool(db, 'prioritize_tasks', { include_completed: true });
    expect(r.success).toBe(true);
    expect(r.result.ranked_tasks.filter(t => t.status === 'completed').length).toBeGreaterThan(0);
  });
});

// ─── create_study_plan ────────────────────────────────────────────
describe('Tool: create_study_plan', () => {
  test('creates sessions within daily hour limit', async () => {
    const r = await executeTool(db, 'create_study_plan', { days_ahead: 2, replace_existing: true });
    expect(r.success).toBe(true);
    expect(r.result.sessions_created).toBeGreaterThan(0);
    const sessions = r.result.sessions;
    const byDate = {};
    for (const s of sessions) {
      byDate[s.session_date] = (byDate[s.session_date] || 0) + s.duration_minutes;
    }
    for (const [, total] of Object.entries(byDate)) {
      expect(total).toBeLessThanOrEqual(6 * 60 + 30); // daily_hours * 60 + small tolerance
    }
  });

  test('no time overlap within same day', async () => {
    const r = await executeTool(db, 'create_study_plan', { days_ahead: 1, replace_existing: true });
    expect(r.success).toBe(true);
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = r.result.sessions.filter(s => s.session_date === today)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    for (let i = 1; i < todaySessions.length; i++) {
      const prev = todaySessions[i - 1];
      const curr = todaySessions[i];
      const [ph, pm] = prev.start_time.split(':').map(Number);
      const [ch, cm] = curr.start_time.split(':').map(Number);
      const prevEnd = ph * 60 + pm + prev.duration_minutes;
      const currStart = ch * 60 + cm;
      expect(currStart).toBeGreaterThan(prevEnd);
    }
  });
});

// ─── create_task ──────────────────────────────────────────────────
describe('Tool: create_task', () => {
  test('creates task and subject if needed', async () => {
    const r = await executeTool(db, 'create_task', {
      title: 'New Maths Assignment',
      subject_name: 'Mathematics',
      deadline: addDays(3),
      priority: 'high',
      estimated_hours: 2,
    });
    expect(r.success).toBe(true);
    expect(r.result.task.title).toBe('New Maths Assignment');
    expect(db.getAll('subjects').find(s => s.name === 'Mathematics')).toBeDefined();
  });

  test('rejects invalid deadline format', async () => {
    const r = await executeTool(db, 'create_task', {
      title: 'Bad Task', subject_name: 'Test', deadline: 'not-a-date', priority: 'medium', estimated_hours: 1,
    });
    expect(r.success).toBe(false);
  });
});

// ─── update_task_status ───────────────────────────────────────────
describe('Tool: update_task_status', () => {
  test('updates task status by title', async () => {
    const r = await executeTool(db, 'update_task_status', { task_title: 'DBMS Assignment', status: 'completed' });
    expect(r.success).toBe(true);
    expect(r.result.success).toBe(true);
    const task = db.getOne('tasks', t => t.id === 'task-002');
    expect(task.status).toBe('completed');
  });

  test('returns not found for unknown task', async () => {
    const r = await executeTool(db, 'update_task_status', { task_title: 'nonexistent xyz 999', status: 'completed' });
    expect(r.success).toBe(true);
    expect(r.result.success).toBe(false);
  });

  test('validates status enum', async () => {
    const r = await executeTool(db, 'update_task_status', { task_title: 'DSA Exam Prep', status: 'invalid_status' });
    expect(r.success).toBe(false);
  });
});

// ─── get_progress_summary ────────────────────────────────────────
describe('Tool: get_progress_summary', () => {
  test('calculates completion percentages', async () => {
    const r = await executeTool(db, 'get_progress_summary', {});
    expect(r.success).toBe(true);
    expect(r.result.tasks.total).toBeGreaterThan(0);
    expect(r.result.tasks.completion_percentage).toBeGreaterThanOrEqual(0);
    expect(r.result.tasks.completion_percentage).toBeLessThanOrEqual(100);
    expect(typeof r.result.summary).toBe('string');
  });
});

// ─── revise_study_plan ────────────────────────────────────────────
describe('Tool: revise_study_plan', () => {
  test('preserves completed sessions and creates new ones', async () => {
    // Add a completed session first
    db.insert('study_sessions', {
      id: 'test-completed-session', task_id: 'task-001', topic_id: null,
      subject_id: 'subject-dsa', title: 'Test Completed Session',
      session_date: addDays(-1), start_time: '09:00', duration_minutes: 60, status: 'completed', notes: '',
    });
    const beforeCompleted = db.count('study_sessions', s => s.status === 'completed');
    const r = await executeTool(db, 'revise_study_plan', { reason: 'Missed session', days_ahead: 2 });
    expect(r.success).toBe(true);
    expect(r.result.preserved_completed).toBe(beforeCompleted);
    const afterCompleted = db.count('study_sessions', s => s.status === 'completed');
    expect(afterCompleted).toBe(beforeCompleted);
  });
});

// ─── Tool validation ──────────────────────────────────────────────
describe('Tool validation & edge cases', () => {
  test('rejects unknown tool', async () => {
    const r = await executeTool(db, 'nonexistent_tool', {});
    expect(r.success).toBe(false);
    expect(r.error).toContain('Unknown tool');
  });

  test('agent demo mode works without API key', async () => {
    const { runDemoAgent } = await import('../src/agent/agent.js');
    const result = await runDemoAgent(db, 'Show my progress');
    expect(result.response).toBeDefined();
    expect(result.model).toBe('DEMO_MODE');
    expect(result.is_demo).toBe(true);
    expect(result.trace.length).toBeGreaterThan(0);
  });

  test('demo mode handles plan request', async () => {
    const { runDemoAgent } = await import('../src/agent/agent.js');
    const result = await runDemoAgent(db, 'Plan my study schedule for tomorrow');
    expect(result.response).toBeDefined();
    expect(result.is_demo).toBe(true);
  });
});
