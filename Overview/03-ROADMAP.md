# Mission Control — Feature Roadmap & What to Add

**Version:** 2.2 (current)  
**Purpose:** Everything that could be built next, organized by category with implementation notes.

---

## How to Use This Document

Each item is rated by effort:
- 🟢 **Small** — a few hours, mostly frontend
- 🟡 **Medium** — half a day to a day, backend + frontend
- 🔴 **Large** — multi-day, architectural work

Items marked ⚡ are the highest-value additions based on how the system is currently used.

---

## Category 1 — Kanban Improvements

### ✅ ~~⚡ 🟢 Edit Tasks In-Place~~ — **DONE (v2.1)**
Click any task card to open the Task Detail drawer. All fields are editable (title, description, column, priority, due date, assignee). Changes save via `PATCH /api/tasks/:id`.

---

### ✅ ~~⚡ 🟡 Backend Migration~~ — **DONE (v2.2)**
Replaced Express + JSON-file storage with Vercel Serverless Functions (`/api/*.js`) and MongoDB Atlas using the native `mongodb` driver. Full connection caching, production-ready.

---

### ✅ ~~⚡ 🟡 Agent Registry~~ — **DONE (v2.2)**
Agents tab now has two sections: a **Registry** (card grid of all registered agents with role, description, and live assigned-task count) and the existing **Activity Log**. Agents can self-register via `POST /api/agents` on startup — the call is idempotent. SPARC shows with a gold border as the orchestrator.

---

### ⚡ 🟢 Task Detail / Subtasks
Expand a task card to see full details and add subtasks.

**What to build:**
- Click a card to open a detail panel (side drawer or modal)
- Show full description, due date, assignee, creation date
- Add a subtask list — checklist items stored as an array on the task
- Subtask completion tracked with a checkbox, percent complete shown on the card

**Backend change:** Add `subtasks: [ { id, text, done } ]` field to the task schema in `tasks.js`

---

### 🟢 Task Labels / Tags
Color-coded labels for grouping tasks (e.g. "Client", "Internal", "Urgent", "Follow-up").

**What to build:**
- Multi-select label picker in the task creation/edit modal
- Labels shown as small colored chips on the card
- Filter button in the Kanban header to show only tasks with a specific label

**Backend change:** Add `labels: []` array to task schema

---

### 🟢 Column WIP Limits
Show a warning when a column has too many active tasks (e.g. more than 5 in "In Progress").

**What to build:**
- Configurable limit per column (stored in `mc-data.json` or a settings endpoint)
- Visual indicator (amber border + count turns red) when limit is exceeded
- Optional: block drops to a full column with a toast warning

---

### 🟡 Task Filtering and Search
Find tasks quickly across all columns.

**What to build:**
- Search bar above the board that filters cards in real time (client-side, no API call)
- Filter dropdowns for priority, assignee, column
- "Clear filters" button
- Keyboard shortcut (`/` or `Ctrl+F`) to focus the search bar

---

### 🟡 Task Sort Within Columns
Control the order of cards inside a column.

**What to build:**
- `order` field (integer) on each task, stored in `tasks.json`
- Drag-within-column to reorder (currently drag only moves between columns)
- Sort buttons: by priority, by due date, by creation date

**Backend change:** `PATCH /api/tasks/:id` already supports arbitrary field updates — just add `order` to the allowed list in `updateTask()`

---

### 🟡 Archived / Completed Tasks View
Done column can get cluttered. Archive completed tasks but keep them accessible.

**What to build:**
- "Archive Done" button that moves all Done tasks to `archived` status
- Separate "Archive" view in the sidebar showing archived tasks
- `GET /api/tasks?status=archived` query param support in the backend

---

## Category 2 — Calendar Improvements

### ⚡ 🟢 Calendar Entry Edit
Right now entries can only be created or deleted — not edited.

**What to build:**
- Click an entry in the calendar cell to open an edit modal (not just delete)
- Modal pre-filled with existing values
- Save calls a new `PATCH /api/calendar/:id` endpoint

**Backend change:** Add `updateCalendarEntry` to `calendar.js`, add route to `routes/index.js`

---

### ⚡ 🟢 Weekly View
A 7-column view showing the current week in more detail than the month grid.

**What to build:**
- Toggle button (Month / Week) in the calendar header
- Week view shows each day as a column with more vertical space per entry
- Entries show full title instead of truncated
- Navigate week-by-week with prev/next arrows

---

### 🟢 Link Calendar Entries to Tasks
Connect a calendar entry to an existing task card.

**What to build:**
- In the "Add Calendar Entry" modal, add a dropdown to select an existing task
- Selected task ID stored in `taskId` field (already in the schema — it's just never set from UI)
- On the calendar cell, entries linked to tasks show a small Kanban icon
- Clicking a linked entry highlights or jumps to the task on the Kanban board

---

### 🟡 Recurring Entries
Add weekly or monthly recurring events.

**What to build:**
- `recurrence` field on calendar entries: `none` / `weekly` / `monthly`
- When fetching calendar, the backend expands recurring entries into all dates within a range
- UI shows a loop icon on recurring entries

**Backend change:** Moderate — expand recurrence logic in `calendar.js`, entries stored as one record with a recurrence rule rather than multiple records

---

### 🟡 30-Day Plan Generator (AI-Assisted)
A dedicated UI that lets you type a goal and have Claude generate a 30-day plan directly into the calendar.

**What to build:**
- "Generate Plan" button in the Calendar view
- Text input: "What is your goal for this month?"
- Calls the Anthropic API (or your AI of choice) with a prompt
- Response is structured as an array of calendar entries
- Sent via `POST /api/calendar` (bulk import — already supported)
- Calendar automatically fills with the plan

**Requires:** API key input field (stored in `localStorage` only, never sent to your server)

---

## Category 3 — AI Agent Improvements

### ⚡ 🟢 Agent Authentication
Right now anyone who can reach your server can push agent updates. Add a simple API key.

**What to build:**
- `AGENT_API_KEY` environment variable checked in `agents.js` for `POST /api/agent-update`
- If the env var is set, requests must include `Authorization: Bearer YOUR_KEY` header
- Requests without the key get `401 Unauthorized`
- Dashboard's `GET /api/agent-updates` remains open (read-only, no key needed)

**Files to touch:** `server/controllers/agents.js` — 10 lines of code

---

### ⚡ 🟡 Real-Time Push (WebSocket or SSE)
Currently the dashboard polls every 10 seconds. Real-time would make agent updates appear instantly.

**Option A — Server-Sent Events (SSE)** — simpler, one-way:
- New endpoint `GET /api/stream` that keeps the connection open and pushes events
- When an agent pushes to `/api/agent-update`, the server broadcasts to all SSE clients
- Frontend replaces the 10-second poll with an `EventSource` listener

**Option B — WebSocket** — bidirectional, more complex:
- Use the built-in `ws` module (one dependency) or implement the WebSocket handshake manually
- More powerful but overkill for this use case

**Recommended:** SSE — it's simpler, works over HTTP, and Node's built-in `http` module supports it natively

---

### 🟢 Agent Management Panel
See which agents are active and how often they push updates.

**What to build:**
- Table showing each unique `source` name, total update count, last seen timestamp
- Derived from the existing `agents.json` data — no new storage needed
- Option to clear an agent's history

---

### 🟡 Agent-to-Agent Messaging
Agents can leave messages for each other via the dashboard as a shared blackboard.

**What to build:**
- New `POST /api/agent-message` endpoint that stores a message with a `to` field
- New `GET /api/agent-messages?to=agent-name` endpoint
- Agents poll this to receive instructions from other agents or from you
- UI in the Agents view showing the message inbox

---

## Category 4 — New Sections / Views

### ⚡ 🟡 Notes / Scratchpad
A persistent text area for quick notes, meeting notes, or context you want to keep handy.

**What to build:**
- New "Notes" view in the sidebar
- Simple rich-text or plain-text editor
- Auto-saves on every keystroke (debounced 1 second) to `POST /api/notes`
- New `GET /api/notes` and `POST /api/notes` endpoints
- Stored in a `notes.json` file (one string, the full content)

**Backend:** Small — two new endpoints, one new file in `store.js`

---

### ⚡ 🟡 Dashboard / Overview Page
A single summary page showing everything at a glance — the "mission control room" view.

**What to build:**
- Metric cards: total tasks, tasks in progress, overdue tasks, calendar entries this month
- Mini Kanban (read-only, just counts per column with visual bars)
- "Today's entries" list from the calendar
- Last 5 agent updates
- Quick-add buttons for task and calendar entry

**Backend:** No new endpoints needed — reuse existing ones

---

### 🟡 Revenue / Client Tracker
Track clients, revenue, and goals (was present in the old v1 system).

**What to build:**
- New "Clients" view with a list of clients — name, monthly value, status
- Revenue goal input and a progress bar showing current MRR vs goal
- Monthly revenue chart (simple bar chart, no library needed — CSS bars)
- `GET/POST /api/clients` endpoints
- Stored in `clients.json`

---

### 🟡 Decisions Log
A place to record important decisions with context and rationale — useful when working with AI agents that need historical context.

**What to build:**
- New "Decisions" view
- Each decision: title, date, options considered, choice made, rationale
- Full CRUD — add, view, delete
- `GET/POST/DELETE /api/decisions` endpoints
- AI agents can also push decisions via `/api/agent-update` (extend the payload schema)

---

### 🔴 Analytics / Reporting
Charts and stats about how you're using Mission Control.

**What to build:**
- Task completion rate over time (tasks moved to Done per week)
- Average time from "To Do" to "Done" (requires tracking `columnHistory` on each task)
- Agent activity over time (updates per day)
- Simple canvas/SVG charts — no library needed for basic bar/line charts

---

## Category 5 — Infrastructure & Production

### ⚡ 🟡 Persistent Storage on Render (SQLite)
Render's free tier resets files on redeploy. SQLite on a persistent disk volume is the simplest upgrade.

**What to build:**
- Replace `store.js` with a SQLite adapter using the `better-sqlite3` npm package (one dependency)
- Create a Render Disk and mount it (available on paid plans)
- Tables: `tasks`, `calendar_entries`, `agent_log`
- All 6 store methods stay identical — nothing else changes

**Alternatively:** Turso (SQLite-as-a-service, free tier) or Supabase (PostgreSQL, free tier)

---

### 🟢 Environment Configuration
Centralize all config in environment variables.

**Variables to add:**
```
PORT=10000
AGENT_API_KEY=your-secret-key
MAX_AGENT_LOG=200
POLL_INTERVAL_MS=10000
```

Right now these are hardcoded in `server.js`. Moving them to env vars makes Render deployment config cleaner.

---

### 🟡 Basic Authentication
Password-protect the entire dashboard.

**What to build:**
- `DASHBOARD_PASSWORD` environment variable
- If set, `server.js` checks for a `session` cookie on every non-API request
- Login page (`/login`) served for unauthenticated requests
- Single password, no user accounts — simple and sufficient for personal use
- Cookie-based session (no JWT needed)

---

### 🟡 Data Export / Backup
Export all your data as a single JSON file.

**What to build:**
- New `GET /api/export` endpoint that returns all tasks + calendar + agent log as one JSON object
- "Export Data" button in a Settings view
- Browser downloads the JSON file
- Optional: `POST /api/import` to restore from an export file

---

### 🔴 Multi-User / Team Mode
Multiple people sharing one dashboard.

**What to build:**
- User accounts (name + password, stored hashed)
- Session management
- `createdBy` field on tasks and calendar entries
- Assignee field becomes a dropdown from the registered users list
- Requires a proper database (SQLite or PostgreSQL)

---

## Category 6 — UI / UX

### 🟢 Keyboard Shortcuts
Power-user navigation without touching the mouse.

| Shortcut | Action |
|----------|--------|
| `N` | Open Add Task modal (when Kanban is active) |
| `C` | Open Add Calendar Entry modal (when Calendar is active) |
| `1` | Switch to Kanban view |
| `2` | Switch to Calendar view |
| `3` | Switch to AI Agents view |
| `/` | Focus search (when search exists) |
| `Esc` | Close any open modal |

**Files to touch:** `client/index.html` — extend the existing `keydown` listener

---

### 🟢 Collapsed Sidebar
Toggle the sidebar to gain more horizontal space for the Kanban board.

**What to build:**
- Toggle button in the sidebar (hamburger or `←` arrow)
- CSS variable `--nav-w` changes from `200px` to `52px`
- Collapsed state shows only icons, no text
- State saved in `localStorage`

---

### 🟢 Custom Column Names
Let the user rename Kanban columns.

**What to build:**
- Click a column header to edit the display name
- Display names stored separately from column IDs
- IDs (`ideas`, `todo`, `inprogress`, `done`) stay the same in the API — only the label changes
- Stored in a settings endpoint or `localStorage`

---

### 🟡 Mobile Responsive Layout
The current layout is desktop-first. Making it work on a phone.

**What to build:**
- Below 768px: sidebar collapses to a bottom tab bar
- Kanban switches from 4-column grid to a single scrollable column with a column selector
- Calendar switches from month grid to a week list view
- Touch-drag for Kanban cards (HTML5 drag API doesn't work reliably on mobile — need `touchstart`/`touchmove`/`touchend` handlers)

---

### 🟡 Customizable Theme / Accent Color
Let users change the accent color from amber to something else.

**What to build:**
- Color picker in a Settings panel
- Changes the CSS `--amber` variable via JavaScript
- Saved to `localStorage`
- A few preset options (amber, blue, green, red, purple)

---

## Priority Quick-Pick

If you want to know **what to build first**, here's a suggested order based on highest value for least effort:

1. ~~**Edit Tasks**~~ — ✅ Done (v2.1)
2. **Agent API Key** — security, 10 lines of code
3. **Agent Task Filter** — filter Kanban by assignee/agent name so you can see which tasks belong to SPARC, Open Claw, or each sub-agent
4. **Notes/Scratchpad** — high daily utility, simple to build
5. **Dashboard Overview Page** — makes the whole thing feel more complete
6. **Calendar Entry Edit** — parity with task editing
7. **Real-Time SSE** — agent updates feel instant instead of polling
8. **Weekly Calendar View** — much more useful for day-to-day planning
9. **Keyboard Shortcuts** — fast to add, great for power use
10. **Persistent SQLite** — critical if deploying to Render for real
11. **Basic Auth** — protects the dashboard if it's public-facing on Render

---

## SPARC & Multi-Agent Context

This roadmap should be read in light of the planned **SPARC orchestrator** architecture:

- **SPARC** (boss agent) coordinates all sub-agents and can push high-level tasks to Mission Control.
- **Sub-agents** (e.g. research-agent, comms-agent, Open Claw) each push their own updates via `POST /api/agent-update` with their unique `source` name.
- Future features like **Agent Task Filter**, **Agent Management Panel**, and **Agent-to-Agent Messaging** are all higher priority once multiple agents are running simultaneously.
