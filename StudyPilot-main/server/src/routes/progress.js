import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  const db = req.db;
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  const tasks = db.getAll('tasks');
  const topics = db.getAll('topics');
  const sessions = db.getAll('study_sessions');
  const subjects = db.getAll('subjects');

  // Task stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const overdueTasks = tasks.filter(t => t.status !== 'completed' && t.deadline < today).length;

  // Topic stats
  const totalTopics = topics.length;
  const completedTopics = topics.filter(t => t.completed).length;
  const totalHours = topics.reduce((s, t) => s + (t.estimated_hours || 0), 0);
  const completedHours = topics.filter(t => t.completed).reduce((s, t) => s + (t.estimated_hours || 0), 0);

  // Session stats
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.status === 'completed').length;
  const missedSessions = sessions.filter(s => s.status === 'missed').length;
  const upcomingSessions = sessions.filter(s => s.status === 'scheduled' && s.session_date >= today).length;
  const minutesStudied = sessions.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.duration_minutes, 0);

  // Per-subject progress
  const subjectProgress = subjects.map(s => {
    const sTopics = topics.filter(t => t.subject_id === s.id);
    const sTasks = tasks.filter(t => t.subject_id === s.id);
    return {
      id: s.id, name: s.name, color: s.color,
      total_topics: sTopics.length,
      completed_topics: sTopics.filter(t => t.completed).length,
      total_tasks: sTasks.length,
      completed_tasks: sTasks.filter(t => t.status === 'completed').length,
    };
  });

  // Upcoming deadlines
  const upcomingDeadlines = tasks
    .filter(t => t.status !== 'completed' && t.deadline >= today && t.deadline <= nextWeekStr)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 10)
    .map(t => {
      const subject = db.getOne('subjects', s => s.id === t.subject_id);
      return { ...t, subject_name: subject?.name || '', subject_color: subject?.color || '#6366f1' };
    });

  res.json({
    success: true,
    data: {
      tasks: { total: totalTasks, completed: completedTasks, pending: pendingTasks, in_progress: inProgressTasks, overdue: overdueTasks, completion_percentage: totalTasks > 0 ? Math.round(completedTasks / totalTasks * 100) : 0 },
      topics: { total: totalTopics, completed: completedTopics, total_hours: totalHours, completed_hours: completedHours, completion_percentage: totalTopics > 0 ? Math.round(completedTopics / totalTopics * 100) : 0 },
      sessions: { total: totalSessions, completed: completedSessions, missed: missedSessions, upcoming: upcomingSessions, total_minutes_studied: minutesStudied, hours_studied: Math.round(minutesStudied / 60 * 10) / 10 },
      subject_progress: subjectProgress,
      upcoming_deadlines: upcomingDeadlines,
    },
  });
});

export default router;
