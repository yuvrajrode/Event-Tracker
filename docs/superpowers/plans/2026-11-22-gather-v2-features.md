# Gather v2: Moments & Momentum Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and release Gather v2 with a 365-day GitHub-style activity heatmap, "On This Day" flashback engine, in-app keyboard shortcuts, and desktop global quick-log integration.

**Architecture:** Frontend components (Flashbacks, 365-day Heatmap, Keyboard Shortcuts) are implemented cleanly in vanilla JavaScript (`app.js`), semantic HTML (`index.html`), and responsive CSS (`styles.css`). Native desktop capabilities (system tray, window focus, global hotkey) are implemented in Rust (`src/main.rs`) and packaged via GitHub Actions with Inno Setup.

**Tech Stack:** Vanilla JavaScript (ES2022), CSS3 (CSS Variables, Flexbox, Grid), HTML5, Rust 2021 (`tao`, `wry`, `tiny_http`), Inno Setup 6, Node.js Test Runner (`node:test`).

**Spec:** `docs/superpowers/specs/2026-11-22-gather-v2-features-design.md`

## Global Constraints
- Zero external client-side runtime dependencies (no CDN scripts, no React/Vue, 100% offline).
- Preserves full backward compatibility with local storage keys: `gather.events.v1`, `gather.categories.v1`, `gather.theme.v1`, `gather.username.v1`.
- All existing 16 unit tests must continue passing without regression.
- New features must have comprehensive automated unit tests in `tests/`.

## Review Focus
1. **Flashback leap year and date boundaries:** Ensure Feb 29 events or end-of-month dates don't throw Date exceptions.
2. **Heatmap cell count and alignment:** Ensure exactly 365 days / 53 columns are generated without index-out-of-bounds or misaligned day headers across DST shifts.
3. **Keyboard shortcut collisions:** Ensure typing in `<input>`, `<textarea>`, or contenteditable fields does not trigger global in-app hotkeys (e.g. typing "q" in title).
4. **Desktop loopback server safety:** Ensure the embedded `tiny_http` server continues serving all new static assets smoothly without memory leaks.
5. **Window focus and tray restoration:** Ensure global hotkey gracefully unminimizes the window and immediately focuses `#quick-title`.

---

### Task 1: "On This Day" Flashback Engine & UI Banner

**Files:**
- Create: `tests/task6_flashbacks.test.js`
- Modify: `app.js`
- Modify: `index.html`
- Modify: `styles.css`

- [ ] Write failing unit tests in `tests/task6_flashbacks.test.js` covering `findFlashbackEvent` and `formatFlashbackTimeAgo`.
- [ ] Implement `findFlashbackEvent(events, referenceDate = new Date())` and `formatFlashbackTimeAgo(dateStr, referenceDate = new Date())` in `app.js`.
- [ ] Export both functions in `module.exports` for tests.
- [ ] Run `node --test tests/task6_flashbacks.test.js` to verify tests pass.
- [ ] Add `#flashback-banner` HTML structure in `index.html` above the overview stats grid.
- [ ] Style the flashback card with glowing border, category pills, impact badge, and dismiss button in `styles.css`.
- [ ] Wire up `renderFlashbackBanner()` in `app.js` and connect the dismiss button and "View in timeline" click handler.

---

### Task 2: 365-Day Activity Heatmap Matrix & Interactive Tooltip

**Files:**
- Create: `tests/task7_heatmap.test.js`
- Modify: `app.js`
- Modify: `index.html`
- Modify: `styles.css`

- [ ] Write failing unit tests in `tests/task7_heatmap.test.js` covering `getYearlyHeatmapData` (53 columns, 7 rows, intensity mapping 0 to 4).
- [ ] Implement `getYearlyHeatmapData(events, referenceDate = new Date())` and `getHeatmapIntensity(dayEvents)` in `app.js`.
- [ ] Export functions in `module.exports`.
- [ ] Run `node --test tests/task7_heatmap.test.js` to verify tests pass.
- [ ] Add view switcher in `index.html` activity header: `[30-Day Trend | 365-Day Heatmap]` and the `#heatmap-container` element.
- [ ] Style heatmap matrix, month labels, day labels, and 5 intensity color levels in `styles.css`.
- [ ] Implement `renderYearlyHeatmap()` in `app.js` with interactive hover tooltips and click-to-filter timeline functionality.

---

### Task 3: In-App Keyboard Shortcuts & Help Modal

**Files:**
- Create: `tests/task8_shortcuts.test.js`
- Modify: `app.js`
- Modify: `index.html`
- Modify: `styles.css`

- [ ] Write unit tests in `tests/task8_shortcuts.test.js` verifying shortcut key matching and input-field guard clauses.
- [ ] Implement `handleGlobalKeyDown(e)` in `app.js` supporting:
  - `q` / `n`: Focus quick-log input
  - `/`: Focus search input
  - `g o`: Switch to Overview tab
  - `g e`: Switch to Events tab
  - `?`: Toggle keyboard shortcuts helper modal
  - `Escape`: Close open modals or clear search
- [ ] Add shortcuts help dialog in `index.html` and styles in `styles.css`.
- [ ] Run `node --test tests/task8_shortcuts.test.js` to verify tests pass.

---

### Task 4: Windows Desktop Global Quick-Log & Tray Integration

**Files:**
- Modify: `src/main.rs`
- Modify: `Cargo.toml`
- Modify: `app.js`
- Modify: `installer.iss`

- [ ] Add `window.focusQuickAdd()` bridge handler in `app.js` to automatically focus and highlight the quick log bar.
- [ ] Update `src/main.rs` to register global hotkey `Ctrl + Shift + G` using Windows API / Tao events.
- [ ] Wire hotkey event to restore window, bring to foreground (`set_focus()`), and invoke `focusQuickAdd()`.
- [ ] Update `Cargo.toml` version to `2.0.0` and `installer.iss` to `2.0.0`.
- [ ] Run `cargo check` and verify Rust compilation succeeds.

---

### Task 5: Comprehensive Verification & Release v2.0.0

**Files:**
- Run all test suites
- Commit and tag `v2.0.0`
- Push to GitHub and trigger GitHub Actions build

- [ ] Run full test suite: `node --test tests/*.test.js` (all 19+ tests must pass).
- [ ] Verify clean git status and format checks.
- [ ] Commit all changes with descriptive commit messages.
- [ ] Push to `main` branch.
- [ ] Create and push tag `v2.0.0`.
- [ ] Verify GitHub Actions release workflow builds both `gather.exe` and `Gather-Setup-x64.exe`.
