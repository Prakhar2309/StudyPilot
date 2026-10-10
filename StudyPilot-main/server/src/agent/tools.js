import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// ─── Tool: get_student_context ─────────────────────────────────────
const getStudentContext = {
  name: 'get_student_context',
  description: 'Retrieves the student\'s subjects, topics, deadlines, available study hours, and incomplete tasks.',
  inputSchema: z.object({}),
  async execute(db, _input) {
    const settings = db.getOne('student_settings', r => r.id === 'default') || { daily_hours: 6, study_start_time: '09:00' };
    const subjects = db.getAll('subjects');
    const topics = db.getAll('topics');
    const today = new Date().toISOString().split('T')[0];
    const allTasks = db.getAll('tasks', t => t.status !== 'completed');
    const overdueTasks = allTasks.filter(t => t.deadline < today);
    const upcomingTasks = allTasks.filter(t => t.deadline >= today);

    return {
      settings,
      subjects: subjects.map(s => ({ id: s.id, name: s.name, color: s.color })),
      topics: {
        total: topics.length,
        completed: topics.filter(t => t.completed).length,
        incomplete: topics.filter(t => !t.completed).map(t => {
          const subject = db.getOne('subjects', s => s.id === t.subject_id);
          return { id: t.id, title: t.title, subject: subject?.name || '', difficulty: t.difficulty, estimated_hours: t.estimated_hours };
        }),
      },
      tasks: {
        overdue: overdueTasks.map(t => {
          const subject = db.getOne('subjects', s => s.id === t.subject_id);
          return { ...t, subject_name: subject?.name || '' };
        }),
        upcoming: upcomingTasks.slice(0, 10).map(t => {
          const subject = db.getOne('subjects', s => s.id === t.subject_id);
          return { ...t, subject_name: subject?.name || '' };
        }),
        total_incomplete: allTasks.length,
      },
      today,
      daily_study_hours: settings.daily_hours || 6,
    };
  },
};

// ─── Tool: prioritize_tasks ─────────────────────────────────────────
const prioritizeTasks = {
  name: 'prioritize_tasks',
  description: 'Ranks tasks by urgency using deadline proximity, difficulty, and priority.',
  inputSchema: z.object({ include_completed: z.boolean().optional().default(false) }),
  async execute(db, input) {
    const today = new Date();
    let tasks = db.getAll('tasks');
    if (!input.include_completed) tasks = tasks.filter(t => t.status !== 'completed');

    const priorityScore = { critical: 40, high: 30, medium: 20, low: 10 };

    const scored = tasks.map(task => {
      const subject = db.getOne('subjects', s => s.id === task.subject_id);
      const daysUntilDeadline = Math.ceil((new Date(task.deadline) - today) / (1000 * 60 * 60 * 24));
      const urgencyScore = daysUntilDeadline <= 0 ? 50 : daysUntilDeadline <= 1 ? 35 : daysUntilDeadline <= 3 ? 25 : daysUntilDeadline <= 7 ? 15 : 5;
      const totalScore = urgencyScore + (priorityScore[task.priority] || 20);
      const urgency = daysUntilDeadline <= 0 ? 'OVERDUE' : daysUntilDeadline <= 1 ? 'CRITICAL' : daysUntilDeadline <= 3 ? 'HIGH' : daysUntilDeadline <= 7 ? 'MEDIUM' : 'LOW';
      return { ...task, subject_name: subject?.name || '', subject_color: subject?.color || '#6366f1', days_until_deadline: daysUntilDeadline, priority_score: totalScore, is_overdue: daysUntilDeadline < 0, urgency };
    });

    scored.sort((a, b) => b.priority_score - a.priority_score);
    return {
      ranked_tasks: scored,
      summary: `${scored.length} tasks ranked. Top priority: "${scored[0]?.title || 'None'}" (${scored[0]?.urgency || 'N/A'})`,
    };
  },
};

// ─── Tool: create_study_plan ────────────────────────────────────────
const createStudyPlan = {
  name: 'create_study_plan',
  description: 'Generates a study schedule for the next N days. Checks for conflicts and daily hour limits.',
  inputSchema: z.object({
    days_ahead: z.number().int().min(1).max(14).default(3),
    replace_existing: z.boolean().optional().default(false),
  }),
  async execute(db, input) {
    const { days_ahead, replace_existing } = input;
    const settings = db.getOne('student_settings', r => r.id === 'default') || { daily_hours: 6, study_start_time: '09:00' };
    const dailyHours = settings.daily_hours || 6;
    const startHour = parseInt(settings.study_start_time?.split(':')[0] || '9');

    const tasks = db.getAll('tasks', t => t.status !== 'completed')
      .sort((a, b) => {
        const po = { critical: 0, high: 1, medium: 2, low: 3 };
        if (a.deadline !== b.deadline) return a.deadline.localeCompare(b.deadline);
        return (po[a.priority] || 2) - (po[b.priority] || 2);
      });

    if (tasks.length === 0) return { sessions_created: 0, sessions: [], message: 'No pending tasks to schedule.' };

    if (replace_existing) {
      db.deleteWhere('study_sessions', s => s.status === 'scheduled');
    }

    const sessions = [];
    const today = new Date();

    for (let day = 0; day < days_ahead; day++) {
      const date = new Date(today);
      date.setDate(today.getDate() + day);
      const dateStr = date.toISOString().split('T')[0];

      const existingSessions = db.getAll('study_sessions', s => s.session_date === dateStr && (s.status === 'scheduled' || s.status === 'completed'));
      const existingMinutes = existingSessions.reduce((sum, s) => sum + s.duration_minutes, 0);
      let minutesLeft = Math.max(0, dailyHours * 60 - existingMinutes);

      if (minutesLeft <= 0) continue;

      let currentHour = startHour;
      let currentMinute = 0;

      // Skip past existing sessions
      if (existingSessions.length > 0) {
        const sorted = [...existingSessions].sort((a, b) => a.start_time.localeCompare(b.start_time));
        const last = sorted[sorted.length - 1];
        const [h, m] = last.start_time.split(':').map(Number);
        const endMin = h * 60 + m + last.duration_minutes + 15;
        currentHour = Math.floor(endMin / 60);
        currentMinute = endMin % 60;
      }

      for (const task of tasks) {
        if (minutesLeft <= 0 || currentHour >= 22) break;
        if (task.deadline && task.deadline < dateStr) continue;

        const sessionMinutes = Math.min(Math.ceil(task.estimated_hours * 60), Math.min(120, minutesLeft));
        if (sessionMinutes < 30) continue;

        const startTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
        const id = uuidv4();
        const subject = db.getOne('subjects', s => s.id === task.subject_id);
        const session = { id, task_id: task.id, topic_id: null, subject_id: task.subject_id, title: `Study: ${task.title}`, session_date: dateStr, start_time: startTime, duration_minutes: sessionMinutes, status: 'scheduled', notes: '' };
        db.insert('study_sessions', session);
        sessions.push({ ...session, subject_name: subject?.name || '' });

        const totalMin = currentHour * 60 + currentMinute + sessionMinutes + 15;
        currentHour = Math.floor(totalMin / 60);
        currentMinute = totalMin % 60;
        minutesLeft -= sessionMinutes;
      }
    }

    return { sessions_created: sessions.length, sessions, message: `Created ${sessions.length} study sessions over ${days_ahead} days.` };
  },
};

// ─── Tool: create_task ──────────────────────────────────────────────
const createTask = {
  name: 'create_task',
  description: 'Adds a new study task. Creates the subject if it does not exist.',
  inputSchema: z.object({
    title: z.string().min(1).max(200),
    subject_name: z.string().min(1),
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD format required'),
    priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    estimated_hours: z.number().min(0.5).max(100).default(2),
    notes: z.string().optional().default(''),
  }),
  async execute(db, input) {
    let subject = db.getAll('subjects').find(s => s.name.toLowerCase().includes(input.subject_name.toLowerCase()));
    if (!subject) {
      const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
      subject = { id: uuidv4(), name: input.subject_name, description: '', color: colors[Math.floor(Math.random() * colors.length)] };
      db.insert('subjects', subject);
    }
    const id = uuidv4();
    const task = { id, title: input.title, subject_id: subject.id, topic_id: null, deadline: input.deadline, priority: input.priority, estimated_hours: input.estimated_hours, status: 'pending', notes: input.notes };
    db.insert('tasks', task);
    return { task: { ...task, subject_name: subject.name }, message: `Created task "${input.title}" for ${subject.name}, due ${input.deadline}.` };
  },
};

// ─── Tool: update_task_status ───────────────────────────────────────
const updateTaskStatus = {
  name: 'update_task_status',
  description: 'Updates the status of a task to pending, in_progress, or completed.',
  inputSchema: z.object({
    task_id: z.string().optional(),
    task_title: z.string().optional(),
    status: z.enum(['pending', 'in_progress', 'completed']),
  }).refine(d => d.task_id || d.task_title, { message: 'Provide task_id or task_title' }),
  async execute(db, input) {
    let task;
    if (input.task_id) {
      task = db.getOne('tasks', t => t.id === input.task_id);
    } else {
      task = db.getAll('tasks').find(t => t.title.toLowerCase().includes(input.task_title.toLowerCase()));
    }
    if (!task) return { success: false, message: `Task "${input.task_title || input.task_id}" not found.` };

    db.update('tasks', task.id, { status: input.status });
    if (input.status === 'completed') {
      db.getAll('study_sessions', s => s.task_id === task.id && s.status === 'scheduled')
        .forEach(s => db.update('study_sessions', s.id, { status: 'completed' }));
    }
    return { success: true, task: { id: task.id, title: task.title, previous_status: task.status, new_status: input.status }, message: `Task "${task.title}" marked as ${input.status}.` };
  },
};

// ─── Tool: get_progress_summary ─────────────────────────────────────
const getProgressSummary = {
  name: 'get_progress_summary',
  description: 'Calculates completed tasks, remaining tasks, completion percentage, and upcoming deadlines.',
  inputSchema: z.object({}),
  async execute(db, _input) {
    const today = new Date().toISOString().split('T')[0];
    const tasks = db.getAll('tasks');
    const topics = db.getAll('topics');
    const sessions = db.getAll('study_sessions');

    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const overdueTasks = tasks.filter(t => t.status !== 'completed' && t.deadline < today).length;
    const completedTopics = topics.filter(t => t.completed).length;
    const minutesStudied = sessions.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.duration_minutes, 0);
    const missedSessions = sessions.filter(s => s.status === 'missed').length;

    const upcoming = tasks
      .filter(t => t.status !== 'completed' && t.deadline >= today)
      .sort((a, b) => a.deadline.localeCompare(b.deadline))
      .slice(0, 5)
      .map(t => {
        const subject = db.getOne('subjects', s => s.id === t.subject_id);
        return { title: t.title, deadline: t.deadline, priority: t.priority, subject: subject?.name || '' };
      });

    const taskPct = tasks.length > 0 ? Math.round(completedTasks / tasks.length * 100) : 0;
    const topicPct = topics.length > 0 ? Math.round(completedTopics / topics.length * 100) : 0;

    return {
      tasks: { total: tasks.length, completed: completedTasks, pending: pendingTasks, in_progress: inProgressTasks, overdue: overdueTasks, completion_percentage: taskPct },
      topics: { total: topics.length, completed: completedTopics, completion_percentage: topicPct },
      study_hours: Math.round(minutesStudied / 60 * 10) / 10,
      missed_sessions: missedSessions,
      upcoming_deadlines: upcoming,
      summary: `${taskPct}% tasks done, ${topicPct}% topics covered. ${Math.round(minutesStudied / 60 * 10) / 10}h studied. ${overdueTasks} overdue tasks.`,
    };
  },
};

// ─── Tool: revise_study_plan ─────────────────────────────────────────
const reviseStudyPlan = {
  name: 'revise_study_plan',
  description: 'Rebuilds the schedule when sessions are missed or deadlines change. Preserves completed sessions.',
  inputSchema: z.object({
    reason: z.string().min(1),
    days_ahead: z.number().int().min(1).max(14).default(3),
  }),
  async execute(db, input) {
    const { days_ahead, reason } = input;
    const completedCount = db.count('study_sessions', s => s.status === 'completed');
    const missedCount = db.count('study_sessions', s => s.status === 'missed');
    const deleted = db.deleteWhere('study_sessions', s => s.status === 'scheduled');
    const result = await createStudyPlan.execute(db, { days_ahead, replace_existing: false });
    return {
      ...result,
      revision_reason: reason,
      preserved_completed: completedCount,
      cleared_scheduled: deleted,
      missed_sessions_count: missedCount,
      message: `Plan revised (reason: ${reason}). Cleared ${deleted} scheduled sessions. Created ${result.sessions_created} new sessions. ${completedCount} completed sessions preserved.`,
    };
  },
};

// ─── Registry ───────────────────────────────────────────────────────
export const toolRegistry = {
  get_student_context: getStudentContext,
  prioritize_tasks: prioritizeTasks,
  create_study_plan: createStudyPlan,
  create_task: createTask,
  update_task_status: updateTaskStatus,
  get_progress_summary: getProgressSummary,
  revise_study_plan: reviseStudyPlan,
};

export const toolNames = Object.keys(toolRegistry);

export async function executeTool(db, toolName, rawInput = {}) {
  const tool = toolRegistry[toolName];
  if (!tool) return { success: false, error: `Unknown tool: ${toolName}` };
  const parsed = tool.inputSchema.safeParse(rawInput);
  if (!parsed.success) return { success: false, error: `Invalid input for ${toolName}: ${parsed.error.message}` };
  try {
    const result = await tool.execute(db, parsed.data);
    return { success: true, result };
  } catch (err) {
    return { success: false, error: `Tool execution failed: ${err.message}` };
  }
}
