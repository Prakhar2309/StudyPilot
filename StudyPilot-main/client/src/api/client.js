import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  r => r.data,
  err => {
    const msg = err.response?.data?.error || err.message || 'Network error';
    return Promise.reject(new Error(msg));
  }
);

// ─── Subjects ──────────────────────────────────────────────────────
export const subjectsApi = {
  getAll: () => api.get('/subjects'),
  getById: (id) => api.get(`/subjects/${id}`),
  create: (data) => api.post('/subjects', data),
  update: (id, data) => api.put(`/subjects/${id}`, data),
  delete: (id) => api.delete(`/subjects/${id}`),
};

// ─── Topics ────────────────────────────────────────────────────────
export const topicsApi = {
  getAll: (subject_id) => api.get('/topics', { params: subject_id ? { subject_id } : {} }),
  getById: (id) => api.get(`/topics/${id}`),
  create: (data) => api.post('/topics', data),
  update: (id, data) => api.put(`/topics/${id}`, data),
  setComplete: (id, completed) => api.patch(`/topics/${id}/complete`, { completed }),
  delete: (id) => api.delete(`/topics/${id}`),
};

// ─── Tasks ─────────────────────────────────────────────────────────
export const tasksApi = {
  getAll: (filters) => api.get('/tasks', { params: filters }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  updateStatus: (id, status) => api.patch(`/tasks/${id}/status`, { status }),
  delete: (id) => api.delete(`/tasks/${id}`),
};

// ─── Sessions ──────────────────────────────────────────────────────
export const sessionsApi = {
  getAll: (filters) => api.get('/sessions', { params: filters }),
  getToday: () => api.get('/sessions/today'),
  create: (data) => api.post('/sessions', data),
  updateStatus: (id, status, notes) => api.patch(`/sessions/${id}/status`, { status, notes }),
  delete: (id) => api.delete(`/sessions/${id}`),
  deleteBulkScheduled: () => api.delete('/sessions/bulk/scheduled'),
};

// ─── Progress ──────────────────────────────────────────────────────
export const progressApi = {
  getSummary: () => api.get('/progress'),
};

// ─── Agent ─────────────────────────────────────────────────────────
export const agentApi = {
  chat: (message) => api.post('/agent/chat', { message }),
  getRuns: (limit = 20) => api.get('/agent/runs', { params: { limit } }),
  getRun: (id) => api.get(`/agent/runs/${id}`),
  getStatus: () => api.get('/agent/status'),
};

// ─── Settings ──────────────────────────────────────────────────────
export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};

// ─── Health ────────────────────────────────────────────────────────
export const healthApi = {
  check: () => api.get('/health'),
};

export default api;
