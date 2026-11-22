const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateStreaks, calculateAverageImpact, get30DayChartBuckets } = require("../app.js");

test("Task 4: calculateStreaks computes both current and all-time longest streak", () => {
  assert.deepEqual(calculateStreaks([]), { current: 0, longest: 0 });

  const now = new Date();
  const dateStr = (offsetDays) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Case 1: Today only
  const ev1 = [{ date: dateStr(0) }];
  assert.deepEqual(calculateStreaks(ev1), { current: 1, longest: 1 });

  // Case 2: 3 days ending yesterday (current = 3, longest = 3)
  const ev2 = [
    { date: dateStr(1) },
    { date: dateStr(2) },
    { date: dateStr(3) }
  ];
  assert.deepEqual(calculateStreaks(ev2), { current: 3, longest: 3 });

  // Case 3: Historic 5-day streak, 3-day gap, then 2-day current streak
  const ev3 = [
    { date: dateStr(0) }, // current
    { date: dateStr(1) }, // current
    // gap: 2, 3, 4
    { date: dateStr(5) }, // historic run of 5
    { date: dateStr(6) },
    { date: dateStr(7) },
    { date: dateStr(8) },
    { date: dateStr(9) }
  ];
  assert.deepEqual(calculateStreaks(ev3), { current: 2, longest: 5 });
});

test("Task 4: calculateAverageImpact calculates correct mean impact", () => {
  assert.equal(calculateAverageImpact([]), "—");

  const events = [
    { impact: 3 },
    { impact: 4 },
    { impact: 5 }
  ];
  assert.equal(calculateAverageImpact(events), "4.0");

  const single = [{ impact: 1 }];
  assert.equal(calculateAverageImpact(single), "1.0");
});

test("Task 4: get30DayChartBuckets creates 30 consecutive daily buckets", () => {
  const now = new Date(2026, 10, 22); // Nov 22, 2026
  const events = [
    { date: "2026-11-22", sentiment: "good", impact: 4 },
    { date: "2026-11-22", sentiment: "normal", impact: 3 },
    { date: "2026-11-20", sentiment: "bad", impact: 2 },
    { date: "2026-10-01", sentiment: "good", impact: 5 } // Outside 30-day window
  ];

  const buckets = get30DayChartBuckets(events, now);
  assert.equal(buckets.length, 30, "Should generate exactly 30 days");

  const lastBucket = buckets[29]; // Today (Nov 22)
  assert.equal(lastBucket.dateStr, "2026-11-22");
  assert.equal(lastBucket.count, 2);
  assert.equal(lastBucket.good, 1);
  assert.equal(lastBucket.normal, 1);

  const nov20Bucket = buckets[27]; // Nov 20
  assert.equal(nov20Bucket.dateStr, "2026-11-20");
  assert.equal(nov20Bucket.count, 1);
  assert.equal(nov20Bucket.bad, 1);
});
