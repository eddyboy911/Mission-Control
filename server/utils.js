// ============================================================
//  Mission Control — Utilities
// ============================================================

/**
 * Generate a short unique ID with a given prefix.
 * e.g. uid('task') → 'task_1708512000000_ab3f2'
 */
function uid(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

module.exports = { uid };
