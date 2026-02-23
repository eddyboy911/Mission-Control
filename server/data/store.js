// ============================================================
//  Mission Control — JSON Storage Layer
//  Handles persistent read/write for all data entities.
// ============================================================

const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname);

const FILES = {
  tasks:    path.join(DATA_DIR, 'tasks.json'),
  calendar: path.join(DATA_DIR, 'calendar.json'),
  agents:   path.join(DATA_DIR, 'agents.json'),
};

const DEFAULTS = {
  tasks:    [],
  calendar: [],
  agents:   [],
};

// ── Helpers ───────────────────────────────────────────────────

function ensureFile(filePath, defaultVal) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2), 'utf8');
  }
}

function read(filePath, defaultVal) {
  try {
    ensureFile(filePath, defaultVal);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return defaultVal;
  }
}

function write(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ── Public API ────────────────────────────────────────────────

const store = {
  // Tasks
  getTasks()       { return read(FILES.tasks, DEFAULTS.tasks); },
  saveTasks(tasks) { write(FILES.tasks, tasks); },

  // Calendar
  getCalendar()         { return read(FILES.calendar, DEFAULTS.calendar); },
  saveCalendar(entries) { write(FILES.calendar, entries); },

  // Agents / AI log
  getAgents()        { return read(FILES.agents, DEFAULTS.agents); },
  saveAgents(agents) { write(FILES.agents, agents); },
};

// Ensure all files exist on startup
Object.entries(FILES).forEach(([key, file]) => ensureFile(file, DEFAULTS[key]));

module.exports = store;
