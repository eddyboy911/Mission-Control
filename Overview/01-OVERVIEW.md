# Mission Control — System Overview

**Version:** 2.2  
**Stack:** Node.js 20 LTS · Vercel Serverless Functions · MongoDB Atlas · Zero framework dependencies  
**Last updated:** February 2026

---

## What Is Mission Control?

Mission Control is a personal operational command center — a self-hosted web dashboard that runs on your local machine or on Render. It is built to help you manage tasks, plan goals across a calendar, and receive automated updates from AI agents. Everything is persistent, API-driven, and requires no login or cloud service to function.

Think of it as a private headquarters for your work: your tasks live in a Kanban board, your goals and deadlines live in a calendar, and any AI system you build or use can push updates into it automatically via a simple API call.

---

## How It Works — The Big Picture

```
Your Browser (Dashboard UI)
        ↕  HTTP (same origin)
  Node.js Server (server.js)
        ↕  reads / writes
  JSON files on disk
  (tasks.json, calendar.json, agents.json)
        ↑
  External AI agents POST to /api/agent-update
```

There is no database, no authentication layer, and no build step. You run one command — `node server.js` — and everything works.

---

## Current Features

### 1. Kanban Board

A four-column task management board. Columns are:

- **Ideas** — raw thoughts and potential work
- **To Do** — confirmed tasks not yet started
- **In Progress** — active work
- **Done** — completed tasks

**What you can do:**
- Add a task from the dashboard using the "Add Task" button or the small `+` button inside each column
- Fill in title, description, priority (High / Medium / Low), due date, and assignee
- Drag any card from one column to another — the new position saves automatically to the server
- **Click any card** to open the Task Detail drawer (slides in from the right)
- **Edit all fields** in the drawer and save via `PATCH /api/tasks/:id` — changes reflect on the board immediately
- Delete a task from the card (✕ on hover) or from inside the Task Detail drawer
- See tasks created by AI agents — they get a purple `AI` badge
- Each card shows a colored left border: red for high priority, amber for medium, green for low

The live count of tasks per column is shown in the column header. The total task count appears in the left sidebar nav badge.

**Task Detail drawer fields:**
- Editable: Title, Description, Column, Priority, Due Date, Assignee
- Read-only metadata: Task ID, Created timestamp, Last Updated timestamp, Source (Manual or agent name)

---

### 2. Calendar / Goal Planner

A full month-grid calendar (7 columns × 5–6 rows) for planning goals, events, milestones, and reminders.

**What you can do:**
- Navigate forward and backward between months using Prev / Next buttons
- Click any date cell to open a quick-add modal pre-filled with that date
- Add entries manually with a title, description, type, and date
- See entries color-coded by type inside each date cell:
  - **Goal** → amber
  - **Milestone** → purple
  - **Event** → blue
  - **Reminder** → green
- Click any entry inside a cell to delete it (with confirmation)
- Today's date is always highlighted with an amber border
- Cells with entries have a subtle amber border so you can spot busy days at a glance
- Cells show up to 3 entries, then a "+N more" indicator

**AI bulk import:** An AI agent can POST an array of entries to `/api/calendar` and fill the entire month in one call — this is how 30-day goal plans get populated.

---

### 3. AI Agent Feed

A live activity feed showing every update pushed by external AI agents.

**What you can do:**
- See each agent's name (source), message, timestamp, and what it created (tasks / calendar entries)
- The feed auto-polls every 10 seconds so new agent activity appears without refreshing
- Manually refresh at any time with the refresh button
- See the exact time of last poll in the top right of the view
- Read the API contract panel on the right side — it shows the exact `curl` command format any AI needs to call

**What AI agents can push:**
- A human-readable message (what the agent did)
- Tasks — automatically created and added to the Kanban board in the specified column
- Calendar entries — automatically placed on the correct date
- Arbitrary data (stored in the log for reference)

---

### 4. Global Header

Always visible at the top of every view:

- **Brand mark** — mission control logo and name
- **Live clock** — updates every second, 24-hour format
- **Server status pill** — shows ONLINE (green pulse) or OFFLINE (red) based on a health check against `/api/status` that runs every 30 seconds

---

### 5. Sidebar Navigation

Fixed left sidebar with:

- **Kanban** — links to the board, shows total task count badge
- **Calendar** — links to the calendar, shows total entry count badge
- **AI Agents** — links to the agent feed, shows total logged update count badge

Active view is highlighted with an amber left border.

---

### 6. Toast Notifications

Small non-blocking notifications appear in the bottom-right corner for:
- Task created / deleted
- Calendar entry added / deleted
- Drag-and-drop move confirmed
- Any API error (shown in red)
- Toasts dismiss automatically after 3 seconds

---

## Data Storage

All data is stored as JSON files on disk in `server/data/`:

| File | Contents |
|------|----------|
| `tasks.json` | All task cards with full metadata |
| `calendar.json` | All calendar entries |
| `agents.json` | Last 200 AI agent update log entries |

These files are created automatically on first run if they don't exist. They are plain JSON — you can open, read, edit, or back them up at any time.

> **Render note:** Render's free tier uses ephemeral storage, so files reset on redeploy. For production persistence, the `store.js` layer is designed to be swapped out for a database without touching any other file.

---

## Agent Architecture

Mission Control is designed to serve as a command hub for a multi-agent system.

```
SPARC  (Orchestrator / Boss)
  ├── Sub-Agent A  (e.g. research-agent)
  ├── Sub-Agent B  (e.g. comms-agent)
  └── Open Claw   (primary agent)
         ↓
   POST /api/agent-update  →  Mission Control
```

- **SPARC** is the top-level orchestrator that directs and coordinates all sub-agents.
- **Sub-agents** are specialized workers that perform tasks and report back by pushing updates to Mission Control via `POST /api/agent-update`.
- Every agent update includes a `source` field (the agent's name), which is displayed in the AI Agents feed and stamped on any tasks or calendar entries the agent creates.
- **Open Claw** is the primary agent. It can read all tasks (`GET /api/tasks`), move tasks between columns (`PATCH /api/tasks/:id`), create tasks, and push calendar entries.

**Identifying which agent created something:**
- Kanban cards created by an agent show a purple `AI` badge. The Task Detail drawer shows the agent name under **Source**.
- The AI Agents feed lists every agent push with its source name, message, and what was created.

---

## Design System

The dashboard uses an industrial command-center aesthetic:

- **Colors:** Near-black backgrounds (`#080807`) with amber (`#F5A623`) as the primary accent. Green, red, blue, and purple are used contextually for status and entry types.
- **Typography:**
  - `Bebas Neue` — page and section titles
  - `JetBrains Mono` — all labels, codes, metadata, badges
  - `DM Sans` — body text, descriptions, form inputs
- **Background texture:** Subtle 40×40px amber grid overlay at very low opacity
- **Motion:** `fadeUp` entrance animation on view switch, `slideIn` on new cards, smooth drag feedback

---

## Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20 LTS |
| Server | `http` module (built-in) |
| Storage | JSON files via `fs` module (built-in) |
| Frontend | Vanilla HTML + CSS + JavaScript (no frameworks) |
| Drag and drop | Native HTML5 Drag and Drop API |
| Fonts | Google Fonts (loaded from CDN) |
| External dependencies | **None** |

---

## Deployment

**Local:** `node server.js` → open `http://localhost:10000`

**Render:**
1. Push to GitHub
2. New Web Service → Start command: `node server.js`
3. Node 20 environment
4. Done — Render injects `PORT` automatically
