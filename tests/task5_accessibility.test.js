const test = require("node:test");
const assert = require("node:assert/strict");
const { getNextFocusableIndex, getFocusableSelectors } = require("../app.js");

test("Task 5: getFocusableSelectors returns standard accessible query selector", () => {
  const sel = getFocusableSelectors();
  assert.ok(typeof sel === "string", "Selector must be string");
  assert.match(sel, /button/, "Must include button");
  assert.match(sel, /input/, "Must include input");
  assert.match(sel, /textarea/, "Must include textarea");
  assert.match(sel, /select/, "Must include select");
  assert.match(sel, /a\[href\]/, "Must include links");
});

test("Task 5: getNextFocusableIndex cycles focus forwards and backwards", () => {
  const total = 5;

  // Forward tab:
  assert.equal(getNextFocusableIndex(0, total, false), 1);
  assert.equal(getNextFocusableIndex(3, total, false), 4);
  assert.equal(getNextFocusableIndex(4, total, false), 0, "Forward tab at end should wrap to 0");

  // Backward tab (Shift+Tab):
  assert.equal(getNextFocusableIndex(4, total, true), 3);
  assert.equal(getNextFocusableIndex(1, total, true), 0);
  assert.equal(getNextFocusableIndex(0, total, true), 4, "Backward tab at 0 should wrap to last index");

  // Initial focus outside modal (-1 index):
  assert.equal(getNextFocusableIndex(-1, total, false), 0, "Forward tab from outside starts at 0");
  assert.equal(getNextFocusableIndex(-1, total, true), 4, "Backward tab from outside starts at last element");

  // Edge cases: total 0 or 1
  assert.equal(getNextFocusableIndex(0, 0, false), 0);
  assert.equal(getNextFocusableIndex(0, 1, false), 0);
  assert.equal(getNextFocusableIndex(0, 1, true), 0);
});
