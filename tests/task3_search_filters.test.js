const test = require("node:test");
const assert = require("node:assert/strict");
const { highlightMatches, debounce, matchesDateFilter, matchesImpactFilter } = require("../app.js");

test("Task 3: highlightMatches highlights query term while escaping HTML", () => {
  assert.equal(highlightMatches("Simple note", ""), "Simple note");
  assert.equal(highlightMatches("Simple note", null), "Simple note");

  const highlighted = highlightMatches("Completed DS exam yesterday", "ds exam");
  assert.equal(highlighted, "Completed <mark class=\"search-match\">DS exam</mark> yesterday");

  // Preserves exact original casing inside <mark>
  const casePreserved = highlightMatches("React and REACT", "react");
  assert.equal(casePreserved, "<mark class=\"search-match\">React</mark> and <mark class=\"search-match\">REACT</mark>");

  // Escapes dangerous HTML
  const xssSafe = highlightMatches("<script>alert('xss')</script>", "alert");
  assert.equal(xssSafe, "&lt;script&gt;<mark class=\"search-match\">alert</mark>(&#39;xss&#39;)&lt;/script&gt;");
});

test("Task 3: debounce delays execution and merges rapid calls", async () => {
  let count = 0;
  const fn = debounce(() => { count++; }, 30);

  fn();
  fn();
  fn();

  assert.equal(count, 0, "Should not execute synchronously");
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(count, 1, "Should execute exactly once after timeout");
});

test("Task 3: matchesDateFilter correctly filters event dates", () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const todayStr = `${y}-${m}-${d}`;

  assert.ok(matchesDateFilter(todayStr, "all"));
  assert.ok(matchesDateFilter(todayStr, "today"));
  assert.ok(matchesDateFilter(todayStr, "week"));
  assert.ok(matchesDateFilter(todayStr, "month"));
  assert.ok(matchesDateFilter(todayStr, "30days"));
  assert.ok(matchesDateFilter(todayStr, "year"));

  const twoWeeksAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);
  const twoWeeksStr = `${twoWeeksAgo.getFullYear()}-${String(twoWeeksAgo.getMonth() + 1).padStart(2, "0")}-${String(twoWeeksAgo.getDate()).padStart(2, "0")}`;

  assert.ok(!matchesDateFilter(twoWeeksStr, "today"));
  assert.ok(!matchesDateFilter(twoWeeksStr, "week"));
  assert.ok(matchesDateFilter(twoWeeksStr, "30days"));

  const twoYearsAgoStr = `${now.getFullYear() - 2}-01-01`;
  assert.ok(!matchesDateFilter(twoYearsAgoStr, "year"));
  assert.ok(!matchesDateFilter(twoYearsAgoStr, "month"));
});

test("Task 3: matchesImpactFilter correctly filters by impact level", () => {
  assert.ok(matchesImpactFilter(5, "all"));
  assert.ok(matchesImpactFilter(5, "high"));
  assert.ok(matchesImpactFilter(4, "high"));
  assert.ok(!matchesImpactFilter(3, "high"));

  assert.ok(matchesImpactFilter(3, "moderate"));
  assert.ok(!matchesImpactFilter(4, "moderate"));

  assert.ok(matchesImpactFilter(2, "low"));
  assert.ok(matchesImpactFilter(1, "low"));
  assert.ok(!matchesImpactFilter(3, "low"));
});
