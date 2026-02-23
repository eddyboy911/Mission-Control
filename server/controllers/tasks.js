// ============================================================
//  Tasks Controller
//  CRUD operations for Kanban task cards.
// ============================================================

const store  = require('../data/store');
const { uid } = require('../utils');

const VALID_COLUMNS = ['ideas', 'todo', 'inprogress', 'done'];

// GET /api/tasks
function getTasks(req, res) {
  const tasks = store.getTasks();
  res.json({ ok: true, tasks });
}

// POST /api/tasks
function createTask(req, res) {
  const { title, description, column, priority, dueDate, assignee } = req.body;

  if (!title || typeof title !== 'string') {
    return res.status(400).json({ ok: false, error: 'title is required' });
  }

  const col = column && VALID_COLUMNS.includes(column) ? column : 'todo';

  const task = {
    id:          uid('task'),
    title:       title.trim().slice(0, 200),
    description: (description || '').trim().slice(0, 1000),
    column:      col,
    priority:    ['high', 'medium', 'low'].includes(priority) ? priority : 'medium',
    dueDate:     dueDate || null,
    assignee:    assignee || null,
    createdAt:   new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
  };

  const tasks = store.getTasks();
  tasks.push(task);
  store.saveTasks(tasks);

  res.status(201).json({ ok: true, task });
}

// PATCH /api/tasks/:id
function updateTask(req, res) {
  const { id } = req.params;
  const tasks   = store.getTasks();
  const idx     = tasks.findIndex(t => t.id === id);

  if (idx === -1) {
    return res.status(404).json({ ok: false, error: 'Task not found' });
  }

  const allowed = ['title', 'description', 'column', 'priority', 'dueDate', 'assignee'];
  const updates = {};

  allowed.forEach(key => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

  // Validate column if provided
  if (updates.column && !VALID_COLUMNS.includes(updates.column)) {
    return res.status(400).json({ ok: false, error: `column must be one of: ${VALID_COLUMNS.join(', ')}` });
  }

  tasks[idx] = { ...tasks[idx], ...updates, updatedAt: new Date().toISOString() };
  store.saveTasks(tasks);

  res.json({ ok: true, task: tasks[idx] });
}

// DELETE /api/tasks/:id
function deleteTask(req, res) {
  const { id } = req.params;
  const tasks   = store.getTasks();
  const filtered = tasks.filter(t => t.id !== id);

  if (filtered.length === tasks.length) {
    return res.status(404).json({ ok: false, error: 'Task not found' });
  }

  store.saveTasks(filtered);
  res.json({ ok: true, deleted: id });
}

module.exports = { getTasks, createTask, updateTask, deleteTask };
