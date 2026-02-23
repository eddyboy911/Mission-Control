// ============================================================
//  Agent Controller
//  POST /api/agent-update — AI systems push structured updates
//  GET  /api/agent-updates — Dashboard polls for latest feed
// ============================================================

const store  = require('../data/store');
const { uid } = require('../utils');
const tasksCtrl    = require('./tasks');
const calendarCtrl = require('./calendar');

/**
 * POST /api/agent-update
 *
 * AI agents call this endpoint to push structured updates.
 * The payload can include any combination of:
 *
 *   {
 *     "message":  "Human-readable summary of what happened",
 *     "source":   "Agent name / identifier (e.g. 'strategy-agent')",
 *     "tasks":    [ { title, description, column, priority, dueDate } ],
 *     "calendar": [ { date, title, description, type } ],
 *     "data":     { arbitrary key-value store for misc agent data }
 *   }
 *
 * Returns the logged entry so the agent can confirm receipt.
 */
async function agentUpdate(req, res) {
  const { message, source, tasks, calendar, data } = req.body;

  if (!message && !tasks && !calendar) {
    return res.status(400).json({
      ok: false,
      error: 'Payload must include at least one of: message, tasks, calendar',
    });
  }

  const entry = {
    id:        uid('agt'),
    source:    (source || 'unknown-agent').slice(0, 100),
    message:   (message || '').slice(0, 2000),
    data:      data || null,
    createdAt: new Date().toISOString(),
    results:   {},
  };

  // Process tasks if provided
  if (Array.isArray(tasks) && tasks.length > 0) {
    const allTasks = store.getTasks();
    const created  = tasks.map(t => ({
      id:          uid('task'),
      title:       (t.title || 'Untitled').trim().slice(0, 200),
      description: (t.description || '').trim().slice(0, 1000),
      column:      ['ideas','todo','inprogress','done'].includes(t.column) ? t.column : 'todo',
      priority:    ['high','medium','low'].includes(t.priority) ? t.priority : 'medium',
      dueDate:     t.dueDate || null,
      assignee:    t.assignee || null,
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
      source:      entry.source,
    }));
    allTasks.push(...created);
    store.saveTasks(allTasks);
    entry.results.tasksCreated = created.length;
  }

  // Process calendar entries if provided
  if (Array.isArray(calendar) && calendar.length > 0) {
    const allEntries = store.getCalendar();
    const created    = calendar
      .filter(c => c.date && c.title)
      .map(c => ({
        id:          uid('cal'),
        date:        c.date,
        title:       c.title.trim().slice(0, 200),
        description: (c.description || '').trim().slice(0, 1000),
        type:        ['goal','event','milestone','reminder'].includes(c.type) ? c.type : 'event',
        taskId:      c.taskId || null,
        source:      entry.source,
        createdAt:   new Date().toISOString(),
      }));
    allEntries.push(...created);
    store.saveCalendar(allEntries);
    entry.results.calendarCreated = created.length;
  }

  // Append to agent log (keep last 200 entries)
  const agents = store.getAgents();
  agents.unshift(entry);
  if (agents.length > 200) agents.splice(200);
  store.saveAgents(agents);

  res.status(201).json({ ok: true, entry });
}

/**
 * GET /api/agent-updates
 * Dashboard polls this for the latest AI activity feed.
 */
function getAgentUpdates(req, res) {
  const url   = new URL(req.url, `http://${req.headers.host}`);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '30'), 100);
  const agents = store.getAgents();
  res.json({ ok: true, entries: agents.slice(0, limit), total: agents.length });
}

module.exports = { agentUpdate, getAgentUpdates };
