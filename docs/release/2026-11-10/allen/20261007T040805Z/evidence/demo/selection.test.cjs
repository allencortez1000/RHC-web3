'use strict';
const assert = require('node:assert/strict');
const matrix = require('./expected-outcomes.json');
const { selection, includes } = require('./selection.cjs');
const before = JSON.stringify(matrix);
const plan = selection('delayed503-j4-j5', matrix);
assert.deepEqual(plan.selectedCells, [
  { journey: 'J4', failure: 'delayed503' },
  { journey: 'J5', failure: 'delayed503' },
]);
assert.equal(plan.includeSupplemental, false);
assert.equal(plan.excludedCells.length, 13);
assert.ok(plan.excludedCells.every(c => c.status === 'NOT RUN' && !includes(plan, c)));
assert.equal(matrix.cells.filter(c => includes(plan, c)).length, 2);
assert.deepEqual(plan.unchangedLimits, { cellMs: 75000, supervisorMs: 540000, parentMs: 900000 });
for (const value of [undefined, '', '--execute', 'J4', 'delayed503']) {
  assert.throws(() => selection(value, matrix), /BLOCKED/);
}
assert.throws(() => selection('delayed503-j4-j5', { cells: [] }), /matrix shape/);
const full = selection('full', matrix);
assert.equal(full.selectedCells.length, 15);
assert.equal(full.excludedCells.length, 0);
assert.equal(full.includeSupplemental, true);
assert.equal(JSON.stringify(matrix), before);
console.log('PASS: exact targeted selection, 13 exclusions, no supplemental, original limits, rejected invalid plans, full compatibility, no matrix mutation');
