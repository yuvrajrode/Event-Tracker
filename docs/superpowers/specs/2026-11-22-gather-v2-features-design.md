# Gather v2: Moments & Momentum Design Document

**Date:** 2026-11-22  
**Author:** Antigravity & Yuvraj Rode  
**Target:** Gather (Personal Moment & Event Tracker)  
**Status:** Approved for Implementation  

---

## 1. Executive Summary & Intent

Gather has established its core foundation: 1–5 impact rating, categories, search/filters, streaks, and a standalone Windows desktop executable with an Inno Setup installer.

This update introduces three high-impact capabilities that elevate Gather from a passive log into an engaging, daily companion:
1. **GitHub-Style 365-Day Activity Heatmap:** An annual contribution matrix visualizing a full year of life moments, streak density, and impact levels.
2. **"On This Day" Flashbacks (Time Capsule):** Smart anniversary recall that surfaces meaningful moments from 1 year ago, 6 months ago, or 1 month ago.
3. **Global Desktop Quick-Log & Keyboard Shortcuts:** Native `Ctrl+Shift+G` hotkey to summon Gather from anywhere on Windows, system tray integration, and in-app productivity shortcuts (`q`, `/`, `g o`, `g e`).

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Visual Rewarding Experience:** Provide a 365-day overview where every logged moment illuminates the year.
- **Serendipitous Nostalgia:** Remind users of past achievements and milestones on their exact anniversaries without requiring manual search.
- **Frictionless Desktop Capture:** Allow users to log a moment within 2 seconds using a global hotkey `Ctrl+Shift+G` without searching for the window.
- **Dual Compatibility:** Ensure web version works flawlessly with zero Rust/native errors, while the Windows desktop app gets native tray and global hotkey powers.

### Non-Goals
- Cloud synchronization or remote server authentication (Gather remains 100% local-first and private).
- Multi-user collaboration.
- Unnecessary third-party telemetry.

### Anti-Goals
- Cluttering the UI with heavy modals or annoying popups.
- Breaking existing local storage schemas (`gather.events.v1`, `gather.categories.v1`, `gather.theme.v1`, `gather.username.v1`).

---

## 3. Subsystem Architecture

### 3.1 Subsystem A: "On This Day" Flashbacks
- **Data Engine:** `findFlashbackEvent(events, referenceDate = new Date())`
  - Scans `events` for items matching `referenceDate`'s Month & Day in previous years (`yearsAgo >= 1`).
  - If no annual match, checks 180 days (6 months) and 30 days (1 month).
  - Sorts matches by priority: Annual Anniversary > 6-Month > 1-Month; breaks ties by higher impact level (5 down to 1).
- **UI Component:**
  - `<section class="flashback-card" id="flashback-banner" hidden>`
  - Rendered above the Overview stats grid.
  - Shows:
    - Glowing icon `✦` + "ON THIS DAY" + Time badge (e.g., "1 year ago · Nov 22, 2025")
    - Moment Title in bold display font
    - Category pill, Impact badge (`Level X · Label`), Sentiment icon (`☀ Good`)
    - Optional reflection snippet (if notes exist)
    - "Jump to moment" action that takes the user directly to this moment in the timeline.
    - Close `×` button that dismisses the banner for the current session.

### 3.2 Subsystem B: 365-Day Activity Heatmap
- **Data Engine:** `getYearlyHeatmapData(events, referenceDate = new Date())`
  - Generates 53 weekly columns across 7 day rows (Sun to Sat) for the past 365 days.
  - Calculates daily counts, max impact, and assigns intensity `0` through `4`:
    - `0`: 0 events (empty day dot)
    - `1`: 1 event (impact 1–3)
    - `2`: 1 event (impact 4–5) or 2 events
    - `3`: 3+ events or significant impact
    - `4`: 4+ events or epic milestone day
- **UI Component:**
  - Placed in the activity section of the Overview tab with a seamless segmented view switch:
    `[ 30-Day Trend | 365-Day Heatmap ]`
  - Month indicators header (Jan, Feb, Mar ... Nov, Dec).
  - Day label column (M, W, F).
  - Hovering any day cell displays the shared `#chart-tooltip` with:
    - Formatted Date (e.g. `Saturday, Nov 22, 2026`)
    - Event count & Average Impact
    - Bullet list of moment titles
  - Clicking a cell filters the timeline to that specific day and switches to the Events tab.

### 3.3 Subsystem C: Global Desktop Quick-Log & Keyboard Shortcuts
- **Native Desktop Integration (`src/main.rs`):**
  - Uses Windows API / Rust crates to register global hotkey `Ctrl + Shift + G`.
  - When pressed from anywhere:
    - Restores window from minimized / tray state.
    - Brings window to the foreground (`set_focus()`).
    - Dispatches a custom message or JavaScript call `window.focusQuickAdd()` which focuses the `#quick-title` input.
  - Windows System Tray icon with menu (`Open Gather`, `Log Moment`, `Exit`).
- **Web & In-App Keyboard Shortcuts:**
  - `q` / `n`: Focus quick-add input immediately.
  - `/`: Focus search input.
  - `g o`: Go to Overview tab.
  - `g e`: Go to Events tab.
  - `?`: Toggle Keyboard Shortcuts modal helper.

---

## 4. Verification & Testing Strategy
- Unit tests in `tests/task6_flashbacks.test.js` verifying anniversary detection, leap year handling, and multi-year priority.
- Unit tests in `tests/task7_heatmap.test.js` verifying 365-day grid generation, intensity classification, and DST tolerance.
- Unit tests in `tests/task8_shortcuts.test.js` verifying shortcut routing and DOM accessibility.
- End-to-end verification of all existing 16 unit tests (`node --test tests/*.test.js`).
- Cargo build verification of Windows binary and installer.
