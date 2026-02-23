# ⚡ Mission Control v2.0

AI-driven operational dashboard. Node 20 LTS. Zero external dependencies.
Deployable on Render out of the box.

---

## 📁 Project Structure

```
mission-control/
├── server.js                    ← Entry point (run this)
├── package.json
├── server/
│   ├── routes/
│   │   └── index.js             ← Route matching
│   ├── controllers/
│   │   ├── tasks.js             ← Task CRUD
│   │   ├── calendar.js          ← Calendar CRUD
│   │   └── agents.js            ← AI agent push/pull
│   ├── data/
│   │   ├── store.js             ← JSON persistence layer
│   │   ├── tasks.json           ← Auto-created
│   │   ├── calendar.json        ← Auto-created
│   │   └── agents.json          ← Auto-created
│   └── utils.js                 ← Shared utilities
└── client/
    └── index.html               ← Full dashboard UI
```

---

## 🚀 Quick Start

```bash
node server.js
# → http://localhost:10000
```

---

## 🌐 API Reference

### Tasks

| Method   | Path              | Description          |
|----------|-------------------|----------------------|
| GET      | /api/tasks        | List all tasks       |
| POST     | /api/tasks        | Create a task        |
| PATCH    | /api/tasks/:id    | Update a task        |
| DELETE   | /api/tasks/:id    | Delete a task        |

**Task schema:**
```json
{
  "title":       "String (required)",
  "description": "String",
  "column":      "ideas | todo | inprogress | done",
  "priority":    "high | medium | low",
  "dueDate":     "YYYY-MM-DD",
  "assignee":    "String"
}
```

### Calendar

| Method   | Path                 | Description                    |
|----------|----------------------|--------------------------------|
| GET      | /api/calendar        | List all entries               |
| POST     | /api/calendar        | Add entry or array of entries  |
| DELETE   | /api/calendar/:id    | Delete entry                   |

**Calendar entry schema:**
```json
{
  "date":        "YYYY-MM-DD (required)",
  "title":       "String (required)",
  "description": "String",
  "type":        "goal | event | milestone | reminder"
}
```

> **Bulk import**: POST an array to `/api/calendar` to populate an entire 30-day plan at once.

### AI Agent Integration

| Method | Path                | Description                    |
|--------|---------------------|--------------------------------|
| POST   | /api/agent-update   | Push update from AI agent      |
| GET    | /api/agent-updates  | Pull activity feed (dashboard) |

**Agent update payload:**
```json
{
  "message":  "Human-readable description of what happened",
  "source":   "agent-name",
  "tasks":    [ { ...task fields } ],
  "calendar": [ { ...calendar fields } ],
  "data":     { "any": "extra data" }
}
```

All fields are optional — send any combination. Tasks and calendar entries are auto-created when included.

### Status

```
GET /api/status   → { ok, status, uptime, version, node }
```

---

## 🤖 AI Integration Examples

### Push a 30-day goal plan

```bash
curl -X POST http://localhost:10000/api/agent-update \
  -H "Content-Type: application/json" \
  -d '{
    "source": "planning-agent",
    "message": "Generated 30-day growth plan for Q1 2026",
    "calendar": [
      { "date": "2026-03-01", "title": "Launch campaign", "type": "milestone" },
      { "date": "2026-03-07", "title": "Week 1 review",   "type": "goal"      },
      { "date": "2026-03-15", "title": "Mid-month check", "type": "goal"      },
      { "date": "2026-03-31", "title": "Month-end report","type": "milestone" }
    ]
  }'
```

### Create tasks from AI

```bash
curl -X POST http://localhost:10000/api/agent-update \
  -H "Content-Type: application/json" \
  -d '{
    "source": "strategy-agent",
    "message": "Identified 3 priority actions",
    "tasks": [
      { "title": "Contact top 5 prospects",       "column": "todo",       "priority": "high"   },
      { "title": "Prepare Q1 deck",               "column": "inprogress", "priority": "medium" },
      { "title": "Review competitor positioning", "column": "ideas",      "priority": "low"    }
    ]
  }'
```

### Move task to Done (mark completed)

```bash
curl -X PATCH http://localhost:10000/api/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -d '{ "column": "done" }'
```

---

## ☁️ Render Deployment

1. Push this folder to a GitHub repo
2. Create a new **Web Service** on Render
3. Set:
   - **Build command**: *(leave blank — no build step)*
   - **Start command**: `node server.js`
   - **Environment**: Node 20
4. Deploy

The server binds to `process.env.PORT` automatically (Render injects this).

> **Note**: Render's free tier uses ephemeral storage — JSON files reset on redeploy. For persistent production storage, replace `store.js` with a database (PostgreSQL, SQLite via volume, etc.).

---

Built for BrandSparc · Mission Control v2.0
