// ============================================================
//  Calendar Controller
//  Goal / event entries keyed by date (YYYY-MM-DD).
// ============================================================

const store  = require('../data/store');
const { uid } = require('../utils');

// GET /api/calendar
function getCalendar(req, res) {
  const entries = store.getCalendar();
  res.json({ ok: true, entries });
}

// POST /api/calendar
// Accepts single entry OR array of entries (for AI 30-day plan bulk import)
function createCalendarEntry(req, res) {
  const body = req.body;
  const entries = store.getCalendar();

  const toEntry = (item) => {
    if (!item.date || !item.title) {
      throw new Error('Each entry requires date (YYYY-MM-DD) and title');
    }
    return {
      id:          uid('cal'),
      date:        item.date,
      title:       item.title.trim().slice(0, 200),
      description: (item.description || '').trim().slice(0, 1000),
      type:        ['goal', 'event', 'milestone', 'reminder'].includes(item.type)
                     ? item.type
                     : 'event',
      taskId:      item.taskId || null,
      createdAt:   new Date().toISOString(),
    };
  };

  try {
    const newEntries = Array.isArray(body) ? body.map(toEntry) : [toEntry(body)];
    entries.push(...newEntries);
    store.saveCalendar(entries);
    res.status(201).json({ ok: true, created: newEntries.length, entries: newEntries });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
}

// DELETE /api/calendar/:id
function deleteCalendarEntry(req, res) {
  const { id } = req.params;
  const entries  = store.getCalendar();
  const filtered = entries.filter(e => e.id !== id);

  if (filtered.length === entries.length) {
    return res.status(404).json({ ok: false, error: 'Entry not found' });
  }

  store.saveCalendar(filtered);
  res.json({ ok: true, deleted: id });
}

module.exports = { getCalendar, createCalendarEntry, deleteCalendarEntry };
