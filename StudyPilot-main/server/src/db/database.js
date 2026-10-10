/**
 * JSON-based persistence layer.
 * Data is stored in a single JSON file (studypilot-data.json).
 * All operations are synchronous reads/writes — suitable for development use.
 *
 * Schema mirrors the original SQLite design:
 *   settings, subjects, topics, tasks, study_sessions, agent_runs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = process.env.DB_PATH || path.join(__dirname, '../../studypilot-data.json');

const EMPTY_DB = {
  student_settings: [],
  subjects: [],
  topics: [],
  tasks: [],
  study_sessions: [],
  agent_runs: [],
};

function loadData() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('Data load error:', e.message);
  }
  return JSON.parse(JSON.stringify(EMPTY_DB));
}

function saveData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Returns a db-like interface with query methods.
 * All methods operate on in-memory data synced to disk.
 */
export function initDb() {
  let data = loadData();

  const db = {
    _data: data,

    // ── Low-level helpers ──────────────────────────────────────────
    _save() { saveData(this._data); },
    _reload() { this._data = loadData(); },

    // ── Generic CRUD ───────────────────────────────────────────────
    getAll(table, filterFn) {
      const rows = this._data[table] || [];
      return filterFn ? rows.filter(filterFn) : rows;
    },

    getOne(table, filterFn) {
      return (this._data[table] || []).find(filterFn) || null;
    },

    insert(table, row) {
      if (!this._data[table]) this._data[table] = [];
      this._data[table].push({ ...row, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      this._save();
      return row;
    },

    update(table, id, updates) {
      const idx = (this._data[table] || []).findIndex(r => r.id === id);
      if (idx === -1) return null;
      this._data[table][idx] = { ...this._data[table][idx], ...updates, updated_at: new Date().toISOString() };
      this._save();
      return this._data[table][idx];
    },

    delete(table, id) {
      const before = (this._data[table] || []).length;
      this._data[table] = (this._data[table] || []).filter(r => r.id !== id);
      const deleted = before - this._data[table].length;
      this._save();
      return deleted;
    },

    deleteWhere(table, filterFn) {
      const before = (this._data[table] || []).length;
      this._data[table] = (this._data[table] || []).filter(r => !filterFn(r));
      const deleted = before - this._data[table].length;
      this._save();
      return deleted;
    },

    count(table, filterFn) {
      return filterFn ? (this._data[table] || []).filter(filterFn).length : (this._data[table] || []).length;
    },
  };

  return db;
}
