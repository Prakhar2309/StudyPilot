import { v4 as uuidv4 } from 'uuid';

export function seedDatabase(db) {
  if (db.count('subjects') > 0) return;
  console.log('🌱 Seeding database with sample data...');

  // Settings
  db.insert('student_settings', {
    id: 'default', daily_hours: 6, timezone: 'Asia/Kolkata',
    study_start_time: '09:00', study_end_time: '22:00', break_duration: 15,
  });

  // Subjects
  const subjects = [
    { id: uuidv4(), name: 'Data Structures & Algorithms', description: 'Core CS algorithms and data structures', color: '#6366f1' },
    { id: uuidv4(), name: 'Database Management Systems', description: 'SQL, NoSQL, ER diagrams, normalization', color: '#10b981' },
    { id: uuidv4(), name: 'Operating Systems', description: 'Process management, memory, file systems', color: '#f59e0b' },
    { id: uuidv4(), name: 'Computer Networks', description: 'TCP/IP, OSI model, protocols', color: '#ef4444' },
    { id: uuidv4(), name: 'Software Engineering', description: 'SDLC, design patterns, testing', color: '#8b5cf6' },
  ];
  subjects.forEach(s => db.insert('subjects', s));
  const [dsa, dbms, os, cn, se] = subjects;

  // Topics
  const topics = [
    { id: uuidv4(), subject_id: dsa.id, title: 'Binary Trees & BST', difficulty: 'medium', estimated_hours: 4, completed: false },
    { id: uuidv4(), subject_id: dsa.id, title: 'Dynamic Programming', difficulty: 'hard', estimated_hours: 8, completed: false },
    { id: uuidv4(), subject_id: dsa.id, title: 'Graph Algorithms (BFS/DFS)', difficulty: 'hard', estimated_hours: 6, completed: false },
    { id: uuidv4(), subject_id: dsa.id, title: 'Sorting Algorithms', difficulty: 'easy', estimated_hours: 3, completed: true },
    { id: uuidv4(), subject_id: dbms.id, title: 'SQL Queries & Joins', difficulty: 'medium', estimated_hours: 4, completed: true },
    { id: uuidv4(), subject_id: dbms.id, title: 'Normalization (1NF-BCNF)', difficulty: 'hard', estimated_hours: 5, completed: false },
    { id: uuidv4(), subject_id: dbms.id, title: 'Transaction & Concurrency', difficulty: 'hard', estimated_hours: 4, completed: false },
    { id: uuidv4(), subject_id: os.id, title: 'Process Scheduling', difficulty: 'medium', estimated_hours: 3, completed: true },
    { id: uuidv4(), subject_id: os.id, title: 'Memory Management & Paging', difficulty: 'hard', estimated_hours: 5, completed: false },
    { id: uuidv4(), subject_id: os.id, title: 'Deadlocks', difficulty: 'medium', estimated_hours: 3, completed: false },
    { id: uuidv4(), subject_id: cn.id, title: 'OSI & TCP/IP Model', difficulty: 'medium', estimated_hours: 3, completed: true },
    { id: uuidv4(), subject_id: cn.id, title: 'Routing Protocols', difficulty: 'hard', estimated_hours: 4, completed: false },
    { id: uuidv4(), subject_id: se.id, title: 'SDLC Models', difficulty: 'easy', estimated_hours: 2, completed: true },
    { id: uuidv4(), subject_id: se.id, title: 'Design Patterns', difficulty: 'medium', estimated_hours: 4, completed: false },
  ];
  topics.forEach(t => db.insert('topics', t));

  const addDays = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  };

  // Tasks
  const tasks = [
    { id: uuidv4(), title: 'DSA Mid-Term Exam Prep', subject_id: dsa.id, deadline: addDays(3), priority: 'critical', estimated_hours: 10, status: 'in_progress', notes: '' },
    { id: uuidv4(), title: 'DBMS Assignment — Normalization', subject_id: dbms.id, deadline: addDays(2), priority: 'high', estimated_hours: 4, status: 'pending', notes: '' },
    { id: uuidv4(), title: 'OS Lab Report Submission', subject_id: os.id, deadline: addDays(1), priority: 'high', estimated_hours: 2, status: 'pending', notes: '' },
    { id: uuidv4(), title: 'Computer Networks Quiz', subject_id: cn.id, deadline: addDays(5), priority: 'medium', estimated_hours: 3, status: 'pending', notes: '' },
    { id: uuidv4(), title: 'SE Project Proposal', subject_id: se.id, deadline: addDays(7), priority: 'medium', estimated_hours: 3, status: 'pending', notes: '' },
    { id: uuidv4(), title: 'Graph Algorithms Practice', subject_id: dsa.id, deadline: addDays(4), priority: 'high', estimated_hours: 4, status: 'pending', notes: '' },
    { id: uuidv4(), title: 'DBMS Transaction Case Study', subject_id: dbms.id, deadline: addDays(6), priority: 'medium', estimated_hours: 2, status: 'pending', notes: '' },
    { id: uuidv4(), title: 'Sorting Algorithm Revision', subject_id: dsa.id, deadline: addDays(2), priority: 'low', estimated_hours: 1, status: 'completed', notes: '' },
  ];
  tasks.forEach(t => db.insert('tasks', t));

  // Sessions
  const [task1, task2, task3, task4] = tasks;
  const sessions = [
    { id: uuidv4(), task_id: task1.id, subject_id: dsa.id, title: 'Dynamic Programming Study', session_date: addDays(0), start_time: '09:00', duration_minutes: 120, status: 'scheduled', notes: '' },
    { id: uuidv4(), task_id: task2.id, subject_id: dbms.id, title: 'Normalization Practice', session_date: addDays(0), start_time: '11:30', duration_minutes: 90, status: 'scheduled', notes: '' },
    { id: uuidv4(), task_id: task3.id, subject_id: os.id, title: 'OS Lab Report Writing', session_date: addDays(0), start_time: '14:00', duration_minutes: 60, status: 'scheduled', notes: '' },
    { id: uuidv4(), task_id: task1.id, subject_id: dsa.id, title: 'DSA Revision Session', session_date: addDays(-1), start_time: '10:00', duration_minutes: 90, status: 'completed', notes: '' },
    { id: uuidv4(), task_id: task2.id, subject_id: dbms.id, title: 'DBMS Concept Review', session_date: addDays(-1), start_time: '15:00', duration_minutes: 60, status: 'missed', notes: '' },
    { id: uuidv4(), task_id: task4.id, subject_id: cn.id, title: 'Computer Networks Study', session_date: addDays(1), start_time: '09:00', duration_minutes: 120, status: 'scheduled', notes: '' },
  ];
  sessions.forEach(s => db.insert('study_sessions', s));
  console.log('✅ Database seeded successfully');
}
