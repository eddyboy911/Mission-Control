# Mission Control — Technical Reference

**Version:** 2.2  
**Base URL (local):** `http://localhost:3000` (via `npx vercel dev`)  
**Base URL (production):** your Vercel deployment URL  

---

## Project Structure

```
mission-control/
├── vercel.json                      ← Vercel routing config
├── package.json                     ← Node 20, mongodb driver
├── .env                             ← MONGODB_URI (local only, never commit)
│
├── lib/
│   └── mongodb.js                   ← Cached MongoClient connection (global)
│
├── api/                             ← Vercel Serverless Functions
│   ├── status.js                    ← GET /api/status
│   ├── tasks/
│   │   ├── index.js                 ← GET + POST /api/tasks
│   │   └── [id].js                  ← PATCH + DELETE /api/tasks/:id
│   ├── calendar/
│   │   ├── index.js                 ← GET + POST /api/calendar
│   │   └── [id].js                  ← DELETE /api/calendar/:id
│   ├── agents/
│   │   ├── index.js                 ← GET + POST /api/agents (Agent Registry)
│   │   └── [id].js                  ← PATCH + DELETE /api/agents/:id
│   ├── agent-update.js              ← POST /api/agent-update
│   └── agent-updates.js             ← GET /api/agent-updates
│
└── client/
    └── index.html                   ← Full dashboard UI (HTML + CSS + JS)
```

---

## MongoDB Collections

| Collection    | Purpose                                           |
|---------------|---------------------------------------------------|
| `tasks`       | All Kanban task documents                        |
| `calendar`    | All calendar/goal entries                        |
| `agents`      | **Agent Registry** — registered agent profiles  |
| `agent_logs`  | Activity log from `POST /api/agent-update` calls |

**Connection:** Managed by `lib/mongodb.js` using a global cached `MongoClient` promise — prevents connection pool exhaustion in serverless environments.

**ID format:** MongoDB ObjectId (24-char hex string). All API responses map `_id` → `id` automatically.

---

## Environment Variables

| Variable        | Required | Description                                               |
|-----------------|----------|-----------------------------------------------------------|
| `MONGODB_URI`   | ✅ Yes   | Full MongoDB Atlas connection string                     |
| `AGENT_API_KEY` | Optional | If set, `POST /api/agent-update` requires `Authorization: Bearer <key>` |

**Local:** Store in `.env` (which is gitignored).  
**Production:** Set in Vercel Dashboard → Project → Settings → Environment Variables.

---

## API Reference

All endpoints return JSON. All write operations accept `Content-Type: application/json`.

---

### Status

#### `GET /api/status`

Health check.

**Response:**
```json
{ "ok": true, "status": "online", "version": "2.2.0" }
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
      "id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "title": "Follow up with client",
      "description": "Send the proposal PDF",
      "column": "todo",
      "priority": "high",
      "dueDate": "2026-03-01",
      "assignee": "SPARC",
      "createdAt": "2026-02-25T14:30:00.000Z",
      "updatedAt": "2026-02-25T14:30:00.000Z",
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
  "assignee":    "open-claw"
}
```

**Required:** `title` · **Defaults:** `column` → `todo`, `priority` → `medium`

**Response:** `201` `{ "ok": true, "task": { ...full task } }`

---

#### `PATCH /api/tasks/:id`

Update any task fields. Send only what changes.

```json
{ "column": "done" }
{ "priority": "high", "assignee": "SPARC" }
```

**Response:** `200` `{ "ok": true, "task": { ...updated task } }`

---

#### `DELETE /api/tasks/:id`

**Response:** `200` `{ "ok": true, "deleted": "<id>" }`

---

### Calendar

#### `GET /api/calendar`

**Response:**
```json
{
  "ok": true,
  "entries": [
    {
      "id": "65f1a2b3c4d5e6f7a8b9c0d2",
      "date": "2026-03-01",
      "title": "Launch campaign",
      "description": "Phase 1 goes live",
      "type": "milestone",
      "source": null,
      "createdAt": "2026-02-25T14:30:00.000Z"
    }
  ]
}
```

**Type values:** `goal` · `event` · `milestone` · `reminder`

---

#### `POST /api/calendar`

Add a single entry or an array (bulk import).

```json
[
  { "date": "2026-03-01", "title": "Launch", "type": "milestone" },
  { "date": "2026-03-07", "title": "Review", "type": "goal" }
]
```

**Required per entry:** `date` (YYYY-MM-DD), `title`  
**Response:** `201` `{ "ok": true, "created": 2, "entries": [...] }`

---

#### `DELETE /api/calendar/:id`

**Response:** `200` `{ "ok": true, "deleted": "<id>" }`

---

### Agent Registry

The Agent Registry stores persistent agent profiles. Agents can self-register on startup — the endpoint is **idempotent** (calling it twice with the same name just updates `lastSeen`).

#### `GET /api/agents`

Returns all registered agents.

**Response:**
```json
{
  "ok": true,
  "agents": [
    {
      "id": "65f1a2b3c4d5e6f7a8b9c0d3",
      "name": "SPARC",
      "role": "orchestrator",
      "description": "Top-level orchestrator. Delegates work to sub-agents.",
      "status": "active",
      "createdAt": "2026-02-25T14:30:00.000Z",
      "lastSeen": "2026-02-25T14:30:00.000Z"
    }
  ]
}
```

**Role values:** `orchestrator` · `primary` · `sub-agent`

---

#### `POST /api/agents`

Register an agent (or update `lastSeen` if already exists).

```json
{
  "name":        "SPARC",
  "role":        "orchestrator",
  "description": "Top-level orchestrator. Manages all sub-agents."
}
```

**Required:** `name`  
**Response:** `201` (new) or `200` (already existed) with `{ "ok": true, "agent": {...}, "alreadyExists": true/false }`

**Agent self-registration on startup:**
```bash
curl -X POST https://your-vercel-url.vercel.app/api/agents \
  -H "Content-Type: application/json" \
  -d '{ "name": "open-claw", "role": "primary", "description": "Primary execution agent" }'
```

---

#### `PATCH /api/agents/:id`

Update agent description, status, or lastSeen.

```json
{ "description": "Updated role description", "status": "idle" }
```

**Response:** `200` `{ "ok": true, "agent": { ...updated } }`

---

#### `DELETE /api/agents/:id`

Remove an agent from the registry (does not delete their tasks).

**Response:** `200` `{ "ok": true, "deleted": "<id>" }`

---

### AI Agent Activity Log

#### `POST /api/agent-update`

Push an update from an AI agent. Creates tasks and/or calendar entries atomically.

**Request body:**
```json
{
  "message":  "Completed weekly analysis and created action items",
  "source":   "SPARC",
  "tasks": [
    {
      "title":    "Call top 3 prospects",
      "column":   "todo",
      "priority": "high",
      "dueDate":  "2026-03-05",
      "assignee": "open-claw"
    }
  ],
  "calendar": [
    { "date": "2026-03-05", "title": "Prospect deadline", "type": "reminder" }
  ],
  "data": { "any": "extra data" }
}
```

All fields optional. Must include at least one of `message`, `tasks`, `calendar`, or `data`.

**Response:** `201`
```json
{
  "ok": true,
  "entry": {
    "id": "65f...",
    "source": "SPARC",
    "message": "...",
    "results": { "tasksCreated": 1, "calendarCreated": 1 },
    "createdAt": "2026-02-25T14:30:00.000Z"
  }
}
```

---

#### `GET /api/agent-updates`

Returns the agent activity log. Dashboard polls every 10 seconds.

**Query params:** `limit` (default 50)  
**Response:** `{ "ok": true, "entries": [...], "total": 14 }` — newest first, max 200 kept.

---

## Frontend Architecture — `client/index.html`

Single-file application. No build step, no framework, no bundler.

**State variables:**
```javascript
let tasks         = [];   // all tasks from API
let calEntries    = [];   // all calendar entries from API
let agentEntries  = [];   // agent activity log entries
let agentRegistry = [];   // registered agent profiles
let calViewDate   = new Date();
let draggingId    = null;
let editingTaskId = null;
```

**Key functions:**

| Function | Purpose |
|----------|---------|
| `init()` | Runs on load — checks status, loads all data, starts polling |
| `loadTasks()` | Fetches `/api/tasks`, calls `renderKanban()` |
| `renderKanban()` | Rebuilds all 4 columns from the `tasks` array |
| `buildTaskCard(task)` | Creates a draggable card DOM element |
| `openTaskDetail(id)` | Opens the Task Detail drawer for editing |
| `saveTaskEdit()` | Sends PATCH request, updates local state |
| `onDrop(e, col)` | Handles drop — updates local state, calls PATCH |
| `loadCalendar()` | Fetches `/api/calendar`, renders grid |
| `loadAgentRegistry()` | Fetches `/api/agents`, calls `renderAgentRegistry()` |
| `renderAgentRegistry()` | Builds agent cards with live task counts |
| `submitRegisterAgent()` | POSTs to `/api/agents`, adds card to grid |
| `loadAgents()` | Fetches `/api/agent-updates`, calls `renderAgentFeed()` |
| `startPolling()` | 10-second interval for tasks + agents + registry |
| `api(method, path, body)` | Central fetch wrapper |
| `toast(msg, type)` | Bottom-right notification |

**Polling interval:** 10 seconds (tasks, agent feed, agent registry)  
**Status check interval:** 30 seconds

---

## Deployment

### Local
```bash
# 1. Set MONGODB_URI in .env
# 2. Run local Vercel dev server
npx vercel dev
# → http://localhost:3000
```

### Production (Vercel)
```bash
npx vercel --prod
```

Or push to the connected GitHub repo — Vercel auto-deploys on every push to `main`.

**Environment variables to set in Vercel Dashboard:**
- `MONGODB_URI` — your Atlas connection string
- `AGENT_API_KEY` — (optional) API key for agent endpoint security

> **Note:** MongoDB Atlas free tier (M0) is sufficient for this project. Make sure your Atlas cluster's Network Access allows connections from `0.0.0.0/0` (anywhere) for Vercel's dynamic IPs.
