// ============================================================
//  Mission Control — Routes
//  Maps HTTP method + path → controller function.
// ============================================================

const tasks    = require('../controllers/tasks');
const calendar = require('../controllers/calendar');
const agents   = require('../controllers/agents');

/**
 * Returns the handler for a given method + pathname, or null.
 * Pattern params (e.g. :id) are extracted and added to req.params.
 */
function matchRoute(method, pathname) {
  const routes = [
    // Tasks
    { method: 'GET',    pattern: '/api/tasks',          handler: tasks.getTasks },
    { method: 'POST',   pattern: '/api/tasks',          handler: tasks.createTask },
    { method: 'PATCH',  pattern: '/api/tasks/:id',      handler: tasks.updateTask },
    { method: 'DELETE', pattern: '/api/tasks/:id',      handler: tasks.deleteTask },

    // Calendar
    { method: 'GET',    pattern: '/api/calendar',       handler: calendar.getCalendar },
    { method: 'POST',   pattern: '/api/calendar',       handler: calendar.createCalendarEntry },
    { method: 'DELETE', pattern: '/api/calendar/:id',   handler: calendar.deleteCalendarEntry },

    // Agents / AI
    { method: 'POST',   pattern: '/api/agent-update',   handler: agents.agentUpdate },
    { method: 'GET',    pattern: '/api/agent-updates',  handler: agents.getAgentUpdates },

    // Status
    { method: 'GET',    pattern: '/api/status',         handler: statusHandler },
  ];

  for (const route of routes) {
    if (route.method !== method) continue;
    const params = matchPattern(route.pattern, pathname);
    if (params !== null) return { handler: route.handler, params };
  }

  return null;
}

/** Simple pattern matcher that extracts :param segments */
function matchPattern(pattern, pathname) {
  const pParts = pattern.split('/');
  const uParts = pathname.split('/');
  if (pParts.length !== uParts.length) return null;

  const params = {};
  for (let i = 0; i < pParts.length; i++) {
    if (pParts[i].startsWith(':')) {
      params[pParts[i].slice(1)] = decodeURIComponent(uParts[i]);
    } else if (pParts[i] !== uParts[i]) {
      return null;
    }
  }
  return params;
}

const START_TIME = Date.now();

function statusHandler(req, res) {
  const upSec = Math.floor((Date.now() - START_TIME) / 1000);
  res.json({
    ok:      true,
    status:  'online',
    uptime:  `${Math.floor(upSec/3600)}h ${Math.floor((upSec%3600)/60)}m ${upSec%60}s`,
    version: '2.0.0',
    node:    process.version,
  });
}

module.exports = { matchRoute };
