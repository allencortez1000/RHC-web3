'use strict';
// Deliberately two named plans, not an arbitrary filter or assertion override.
function selection(name, matrix) {
  if (!['full', 'delayed503-j4-j5'].includes(name)) throw Error('BLOCKED: unknown or missing explicit selection value');
  const targeted = name === 'delayed503-j4-j5';
  const selectedCells = matrix.cells.filter(c => !targeted || (c.failure === 'delayed503' && ['J4', 'J5'].includes(c.journey)))
    .map(c => ({ journey: c.journey, failure: c.failure }));
  if (selectedCells.length !== (targeted ? 2 : 15)) throw Error('BLOCKED: selected matrix shape changed');
  return { name, targeted, includeSupplemental: !targeted, selectedCells,
    excludedCells: matrix.cells.filter(c => !selectedCells.some(s => s.journey === c.journey && s.failure === c.failure))
      .map(c => ({ journey: c.journey, failure: c.failure, status: 'NOT RUN', reason: 'Excluded by explicit targeted continuation selection' })),
    setup: targeted ? ['Supported customer-maya login', 'Supported customer-noah login', 'Supported system-admin login', 'Independent public browser context'] : ['Original full-matrix setup'],
    unchangedLimits: { cellMs: 75000, supervisorMs: 540000, parentMs: 900000 },
    store: 'Fresh canonical auto-initialized store; never reset/import/reuse earlier attempt stores',
    claim: targeted ? 'Separate targeted continuation, NOT one clean 15/15 run or one shared historical store' : 'Full matrix attempt',
  };
}
function includes(plan, cell) { return plan.selectedCells.some(c => c.journey === cell.journey && c.failure === cell.failure); }
module.exports = { selection, includes };
