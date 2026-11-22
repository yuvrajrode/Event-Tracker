const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeEvent, IMPACTS, renderImpactBadge } = require("../app.js");

test("Task 1: normalizeEvent sets default impact to 3 when missing or invalid", () => {
  const e1 = normalizeEvent({ title: "Walk in park" });
  assert.equal(e1.impact, 3, "Default impact should be 3");

  const e2 = normalizeEvent({ title: "Bad impact", impact: 10 });
  assert.equal(e2.impact, 3, "Impact > 5 should fallback to 3");

  const e3 = normalizeEvent({ title: "Bad impact 2", impact: 0 });
  assert.equal(e3.impact, 3, "Impact < 1 should fallback to 3");

  const e4 = normalizeEvent({ title: "Non-numeric impact", impact: "huge" });
  assert.equal(e4.impact, 3, "Non-integer impact should fallback to 3");
});

test("Task 1: normalizeEvent preserves valid impact values 1 to 5", () => {
  for (let i = 1; i <= 5; i++) {
    const e = normalizeEvent({ title: `Event ${i}`, impact: i });
    assert.equal(e.impact, i, `Impact ${i} should be preserved`);
  }
});

test("Task 1: IMPACTS contains definitions for levels 1 through 5", () => {
  assert.ok(IMPACTS, "IMPACTS object must exist");
  for (let i = 1; i <= 5; i++) {
    assert.ok(IMPACTS[i], `IMPACTS[${i}] must exist`);
    assert.ok(typeof IMPACTS[i].label === "string", `IMPACTS[${i}].label must be string`);
    assert.ok(typeof IMPACTS[i].hint === "string", `IMPACTS[${i}].hint must be string`);
    assert.ok(typeof IMPACTS[i].dots === "string", `IMPACTS[${i}].dots must be string`);
  }
});

test("Task 1: renderImpactBadge renders accessible badge and dots", () => {
  const badge1 = renderImpactBadge(1);
  assert.match(badge1, /Minor/, "Should contain Minor label");
  assert.match(badge1, /●○○○○/, "Should contain 1 dot");

  const badge3 = renderImpactBadge(3);
  assert.match(badge3, /Moderate/, "Should contain Moderate label");
  assert.match(badge3, /●●●○○/, "Should contain 3 dots");

  const badge5 = renderImpactBadge(5);
  assert.match(badge5, /Major/, "Should contain Major label");
  assert.match(badge5, /●●●●●/, "Should contain 5 dots");
});
