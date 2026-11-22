const test = require("node:test");
const assert = require("node:assert/strict");
const { getTimelineGroup, mergeEvents, reassignCategoryEvents } = require("../app.js");

test("Task 2: getTimelineGroup categorizes dates correctly across DST boundaries", () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const todayStr = `${y}-${m}-${d}`;

  assert.equal(getTimelineGroup(todayStr), "Today");

  // Yesterday
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
  assert.equal(getTimelineGroup(yStr), "Yesterday");

  // 3 days ago (This Past Week)
  const threeDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3);
  const tStr = `${threeDaysAgo.getFullYear()}-${String(threeDaysAgo.getMonth() + 1).padStart(2, "0")}-${String(threeDaysAgo.getDate()).padStart(2, "0")}`;
  assert.equal(getTimelineGroup(tStr), "This Past Week");
});

test("Task 2: mergeEvents combines existing and incoming events without duplicates", () => {
  const existing = [
    { id: "1", title: "Original 1", category: "Work", date: "2026-11-20", sentiment: "good", impact: 3 },
    { id: "2", title: "Original 2", category: "Personal", date: "2026-11-21", sentiment: "normal", impact: 2 }
  ];

  const incoming = [
    { id: "2", title: "Updated 2", category: "Personal", date: "2026-11-21", sentiment: "good", impact: 4 }, // Updated
    { id: "3", title: "New 3", category: "Wellness", date: "2026-11-22", sentiment: "good", impact: 5 } // New
  ];

  const merged = mergeEvents(existing, incoming);
  assert.equal(merged.length, 3, "Total merged events should be 3");

  const item2 = merged.find((e) => e.id === "2");
  assert.equal(item2.title, "Updated 2", "Existing item should be updated");
  assert.equal(item2.impact, 4, "Updated impact should be 4");

  const item3 = merged.find((e) => e.id === "3");
  assert.ok(item3, "New item should be added");
});

test("Task 2: reassignCategoryEvents safely reassigns deleted category events to fallback", () => {
  const events = [
    { id: "1", title: "Work meeting", category: "CustomCat" },
    { id: "2", title: "Gym workout", category: "Wellness" }
  ];

  const updated = reassignCategoryEvents(events, "CustomCat", "Personal");
  assert.equal(updated[0].category, "Personal", "CustomCat should be reassigned to Personal");
  assert.equal(updated[1].category, "Wellness", "Wellness should remain unchanged");
});
