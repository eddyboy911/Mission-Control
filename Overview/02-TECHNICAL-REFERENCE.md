# Mission Control — Technical Reference

**Version:** 2.0  
**Base URL (local):** `http://localhost:10000`  
**Base URL (Render):** your Render service URL

---

## Project Structure

```
mission-control/
├── server.js                        ← Entry point. Run this.
├── package.json                     ← Node 20, no dependencies
│
├── server/
│   ├── utils.js                     ← uid() generator
│   ├── routes/
│   │   └── index.js                 ← Route matching (method + path → handler)
│   ├── controllers/
│   │   ├── tasks.js                 ← Task CRUD logic
│   │   ├── calendar.js              ← Calendar CRUD logic
│   │   └── agents.js                ← AI push + feed logic
│   └── data/
│       ├── store.js                 ← All disk reads/writes go through here
│       ├── tasks.json               ← Auto-created on first run
│       ├── calendar.json            ← Auto-created on first run
│       └── agents.json              ← Auto-created on first run
│
└── client/
    └── index.html                   ← Full dashboard (HTML + CSS + JS, single file)
```

---

## Server Entry Point — `server.js`

**Port binding:**
```javascript
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0');
```

Render injects `process.env.PORT` at runtime. Locally it defaults to `10000`.

**What it does:**
- Handles CORS preflight (`OPTIONS`) for all routes
- Parses JSON body for `POST`, `PATCH`, `PUT` methods
- Delegates all `/api/*` routes to the route matcher
- Serves `client/index.html` for `/`, `/index`, `/dashboard`
- Serves other static files from `client/` with path traversal protection
- Logs every request with method, path, status code, and timestamp
- Handles `SIGINT` / `SIGTERM` for graceful shutdown

**Production URL detection:**
```javascript
const base = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
```
Startup logs use the real public URL on Render instead of localhost.

---

## Route Matching — `server/routes/index.js`

A minimal custom router — no Express, no dependencies.

Supports `:param` segments in patterns. Example:

```
PATCH /api/tasks/task_123_abc
→ matches pattern /api/tasks/:id
→ req.params = { id: "task_123_abc" }
```

Full route table:

| Method | Path | Handler |
|--------|------|---------|
| GET | /api/status | Status handler (inline) |
| GET | /api/tasks | tasks.getTasks |
| POST | /api/tasks | tasks.createTask |
| PATCH | /api/tasks/:id | tasks.updateTask |
| DELETE | /api/tasks/:id | tasks.deleteTask |
| GET | /api/calendar | calendar.getCalendar |
| POST | /api/calendar | calendar.createCalendarEntry |
| DELETE | /api/calendar/:id | calendar.deleteCalendarEntry |
| POST | /api/agent-update | agents.agentUpdate |
| GET | /api/agent-updates | agents.getAgentUpdates |

---

## API Reference

All endpoints return JSON. All write operations accept `Content-Type: application/json`.  
CORS is fully open (`Access-Control-Allow-Origin: *`).

---

### Status

#### `GET /api/status`

Health check.

**Response:**
```json
{
  "ok": true,
  "status": "online",
  "uptime": "2h 15m 30s",
  "version": "2.0.0",
  "node": "v20.x.x"
}
```

---

### Tasks

#### `GET /api/tasks`

Returns all tasks.

**Response:**
```json
{
  "ok": true,
  "tasks": [
    {
      "id": "task_1771850516465_n61i1",
      "title": "Follow up with client",
      "description": "Send the proposal PDF",
      "column": "todo",
      "priority": "high",
      "dueDate": "2026-03-01",
      "assignee": "Danny",
      "createdAt": "2026-02-23T12:00:00.000Z",
      "updatedAt": "2026-02-23T12:00:00.000Z",
      "source": null
    }
  ]
}
```

**Column values:** `ideas` · `todo` · `inprogress` · `done`  
**Priority values:** `high` · `medium` · `low`  
**source field:** `null` for manually created tasks, agent name for AI-created tasks

---

#### `POST /api/tasks`

Create a task.

**Request body:**
```json
{
  "title":       "Task title",
  "description": "Optional details",
  "column":      "todo",
  "priority":    "high",
  "dueDate":     "2026-03-01",
  "assignee":    "Danny"
}
```

**Required:** `title`  
**Defaults:** `column` → `todo`, `priority` → `medium`  
**Limits:** title max 200 chars, description max 1000 chars

**Response:** `201`
```json
{
  "ok": true,
  "task": { ...full task object }
}
```

---

#### `PATCH /api/tasks/:id`

Update any fields on a task. Send only what you want to change.

**Request body (any subset):**
```json
{
  "title":       "Updated title",
  "description": "New description",
  "column":      "inprogress",
  "priority":    "medium",
  "dueDate":     "2026-03-15",
  "assignee":    "Team"
}
```

**Common use case — move to done:**
```json
{ "column": "done" }
```

**Response:** `200`
```json
{
  "ok": true,
  "task": { ...updated task object }
}
```

**Error — not found:** `404`

---

#### `DELETE /api/tasks/:id`

Delete a task permanently.

**Response:** `200`
```json
{
  "ok": true,
  "deleted": "task_1771850516465_n61i1"
}
```

**Error — not found:** `404`

---

### Calendar

#### `GET /api/calendar`

Returns all calendar entries.

**Response:**
```json
{
  "ok": true,
  "entries": [
    {
      "id": "cal_1771850516493_xkisq",
      "date": "2026-03-01",
      "title": "Launch campaign",
      "description": "Phase 1 goes live",
      "type": "milestone",
      "taskId": null,
      "source": null,
      "createdAt": "2026-02-23T12:00:00.000Z"
    }
  ]
}
```

**Type values:** `goal` · `event` · `milestone` · `reminder`

---

#### `POST /api/calendar`

Add a single entry or an array of entries (bulk import).

**Single entry:**
```json
{
  "date":        "2026-03-01",
  "title":       "Launch campaign",
  "description": "Optional",
  "type":        "milestone"
}
```

**Array (AI 30-day plan import):**
```json
[
  { "date": "2026-03-01", "title": "Week 1 goal",    "type": "goal"      },
  { "date": "2026-03-07", "title": "Mid-check",      "type": "reminder"  },
  { "date": "2026-03-15", "title": "Phase 2 launch", "type": "milestone" },
  { "date": "2026-03-31", "title": "Month review",   "type": "goal"      }
]
```

**Required per entry:** `date` (YYYY-MM-DD), `title`

**Response:** `201`
```json
{
  "ok": true,
  "created": 4,
  "entries": [ ...array of created entries ]
}
```

---

#### `DELETE /api/calendar/:id`

Delete a calendar entry.

**Response:** `200`
```json
{
  "ok": true,
  "deleted": "cal_1771850516493_xkisq"
}
```

---

### AI Agent Endpoints

#### `POST /api/agent-update`

The main AI integration endpoint. Push any combination of: a message, tasks to create, calendar entries to add.

**Request body:**
```json
{
  "message":  "Completed weekly analysis and created action items",
  "source":   "strategy-agent",
  "tasks": [
    {
      "title":       "Call top 3 prospects",
      "description": "Re-engage dormant leads from Q4",
      "column":      "todo",
      "priority":    "high",
      "dueDate":     "2026-03-05",
      "assignee":    "Danny"
    }
  ],
  "calendar": [
    {
      "date":  "2026-03-05",
      "title": "Prospect follow-up deadline",
      "type":  "reminder"
    }
  ],
  "data": {
    "any": "extra data you want stored with this log entry"
  }
}
```

**All fields are optional.** You must include at least one of `message`, `tasks`, or `calendar`.

**Response:** `201`
```json
{
  "ok": true,
  "entry": {
    "id":        "agt_1771850516492_yasqm",
    "source":    "strategy-agent",
    "message":   "Completed weekly analysis and created action items",
    "data":      null,
    "createdAt": "2026-02-23T12:00:00.000Z",
    "results": {
      "tasksCreated":    1,
      "calendarCreated": 1
    }
  }
}
```

The `results` object tells you exactly what was created so the agent can confirm receipt.

---

#### `GET /api/agent-updates`

Returns the agent activity feed. The dashboard polls this every 10 seconds.

**Query params:**
- `limit` — number of entries to return (default: 30, max: 100)

**Example:**
```
GET /api/agent-updates?limit=20
```

**Response:**
```json
{
  "ok": true,
  "entries": [
    {
      "id":        "agt_...",
      "source":    "strategy-agent",
      "message":   "...",
      "data":      null,
      "createdAt": "2026-02-23T12:00:00.000Z",
      "results":   { "tasksCreated": 2 }
    }
  ],
  "total": 14
}
```

Entries are ordered newest first. The log keeps the last 200 entries.

---

## Data Layer — `server/data/store.js`

All disk access is isolated in this single file. Every controller imports `store` and uses these methods:

```javascript
store.getTasks()          // → array
store.saveTasks(array)    // → void

store.getCalendar()       // → array
store.saveCalendar(array) // → void

store.getAgents()         // → array
store.saveAgents(array)   // → void
```

**To swap to a database:** replace `store.js` with any adapter that implements the same 6 methods. No other file needs to change.

---

## ID Format

All IDs are generated by `server/utils.js`:

```javascript
uid('task')  // → "task_1771850516465_n61i1"
uid('cal')   // → "cal_1771850516493_xkisq"
uid('agt')   // → "agt_1771850516492_yasqm"
```

Format: `{prefix}_{timestamp}_{5-char random}` — unique, sortable, human-readable.

---

## Frontend Architecture — `client/index.html`

Single-file application. No build step, no framework, no bundler.

**State variables:**
```javascript
let tasks        = [];   // all tasks from API
let calEntries   = [];   // all calendar entries from API
let agentEntries = [];   // agent feed entries from API
let calViewDate  = new Date(); // which month the calendar is showing
let draggingId   = null; // ID of the card currently being dragged
```

**Key functions:**

| Function | Purpose |
|----------|---------|
| `init()` | Runs on load — checks status, loads all data, starts polling |
| `loadTasks()` | Fetches `/api/tasks`, calls `renderKanban()` |
| `renderKanban()` | Rebuilds all 4 columns from the `tasks` array |
| `buildTaskCard(task)` | Creates a draggable card DOM element |
| `onDrop(e, col)` | Handles drop — updates local state, calls PATCH |
| `loadCalendar()` | Fetches `/api/calendar`, calls `renderCalendar()` |
| `renderCalendar()` | Builds the month grid from `calEntries` |
| `buildCalCell(date, otherMonth)` | Creates one calendar cell |
| `loadAgents()` | Fetches `/api/agent-updates`, calls `renderAgentFeed()` |
| `renderAgentFeed()` | Builds the feed list from `agentEntries` |
| `startPolling()` | Sets 10-second interval for `loadTasks()` + `loadAgents()` |
| `toast(msg, type)` | Shows a bottom-right notification |
| `api(method, path, body)` | Central fetch wrapper with JSON parsing and error throwing |

**Drag and drop flow:**
1. `dragstart` on a card → sets `draggingId`, adds `.dragging` class (reduces opacity)
2. `dragover` on a column body → calls `e.preventDefault()`, adds `.drag-over` highlight
3. `dragleave` → removes highlight
4. `drop` on a column body → reads `draggingId`, does optimistic local update → renders → calls `PATCH /api/tasks/:id` → on error: reverts via `loadTasks()`

**Polling:**
- Tasks + agent feed: every 10 seconds
- Server status check: every 30 seconds

---

## Error Handling

| Scenario | Behavior |
|----------|---------|
| API request fails | Toast with red border + error message |
| Drag-and-drop save fails | Local state reverted via full `loadTasks()` reload |
| Server offline | Status pill shows red OFFLINE, operations still attempted |
| Invalid POST body | 400 response with `{ ok: false, error: "..." }` |
| Task/entry not found | 404 response |
| Path traversal attempt | 403 response |
| Body > 2MB | Request rejected with error |
