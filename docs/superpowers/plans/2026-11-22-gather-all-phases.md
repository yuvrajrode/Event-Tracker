# Gather Moment Tracker — Comprehensive Multi-Phase Enhancement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the friend's requested 1–5 Impact rating system and resolve all architectural, data safety, search, analytics, and accessibility weaknesses across Gather in 5 coordinated phases.

**Architecture:** Pure zero-dependency client-side architecture using vanilla HTML5, CSS3 variables, and modern ES2022 JavaScript with localStorage persistence. Components remain modular, accessible, and responsive.

**Tech Stack:** HTML5, CSS3 (Custom Properties & Animations), Vanilla JavaScript (ES2022, SVG generation, Canvas/DOM APIs), LocalStorage.

**Spec:** Brainstormed specification approving the 1–5 Impact rating system, safe merge/replace import, category CRUD, debounced search highlighting, 30-day activity chart, longest streak calculation, and modal focus trapping.

---

## Global Constraints

- **No external JavaScript libraries, frameworks, or bundlers**: Must run directly in browser by opening `index.html` or executing `Open Gather.bat`.
- **Zero data loss on upgrade**: Existing `localStorage` data (`gather.events.v1`, `gather.categories.v1`, `gather.theme.v1`, `gather.username.v1`) must be normalized gracefully without losing past moments.
- **Theme parity**: Every newly added UI element (pills, badges, dialogs, inputs, highlighters) must support both Light and Dark themes via CSS custom properties.
- **Responsive design**: Works on desktop and mobile screens down to 360px width.

---

## Review Focus

1. **Missing Impact on Legacy Events**: Existing events stored without an `impact` field must safely default to `3` (Moderate) without throwing errors during render or export.
2. **Import Merge Conflict Resolution**: Merging a JSON backup must deduplicate by `id`; if an incoming event has the same `id` as an existing event, update it without creating duplicates.
3. **Category Deletion Fallback**: Deleting a category must reassign affected events to "Personal" rather than leaving orphaned categories that break filters.
4. **Daylight Saving Time (DST) Transitions**: `getTimelineGroup()` and `calculateStreak()` must calculate calendar day differences reliably without being corrupted by 23-hour or 25-hour DST days.
5. **Modal Focus Trap Escapes**: Tabbing forward or backward inside modals must wrap within the modal and never leak focus to background interactive elements.

---

## Tasks

### Task 1: 1–5 Impact System & Event Model (Phase 1 — Friend's Feature)

**Files:**
- Modify: `index.html:143-178` (Quick Log Impact UI)
- Modify: `index.html:343-347` (Modal Impact fieldset)
- Modify: `styles.css` (Impact pills, impact dot indicators, and badges)
- Modify: `app.js:69-84` (Event normalization)
- Modify: `app.js:813-900` (Quick log & Modal impact event handlers)
- Modify: `app.js:560-618` (Event row & Recent highlights impact rendering)

**Interfaces:**
- Consumes: `normalizeEvent(e)`
- Produces: `event.impact` (integer `1..5`), `renderImpactDots(impact)` returning HTML dots `●●●○○` and label.

- [ ] **Step 1: Update Data Model & Normalization**
  In `app.js`: update `normalizeEvent` to validate and default `e.impact`:
  ```javascript
  const impact = Number.isInteger(e.impact) && e.impact >= 1 && e.impact <= 5 ? e.impact : 3;
  ```
  Include `impact` in normalized object return.

- [ ] **Step 2: Add Impact Definitions & Helper**
  In `app.js`: define `IMPACTS`:
  ```javascript
  const IMPACTS = {
    1: { label: "Minor", hint: "Small routine win or slight annoyance", dots: "●○○○○" },
    2: { label: "Noticeable", hint: "Notable moment in your day", dots: "●●○○○" },
    3: { label: "Moderate", hint: "Meaningful milestone or test", dots: "●●●○○" },
    4: { label: "Significant", hint: "High-impact achievement or event", dots: "●●●●○" },
    5: { label: "Major", hint: "Life-changing or unforgettable moment", dots: "●●●●●" }
  };
  ```
  Add `renderImpactBadge(impact)` helper returning accessible badge HTML.

- [ ] **Step 3: Update Modal & Quick Log HTML in `index.html`**
  - In `#quick-add-form`: add a quick impact selector pill group (1 to 5) or dropdown beside the sentiment pills.
  - In `#event-modal-backdrop`: add a dedicated `<fieldset class="impact-fieldset">` with 5 selectable impact buttons showing numbers, descriptive labels, and visual dots preview.

- [ ] **Step 4: Add CSS Styles in `styles.css`**
  Add styles for `.impact-picker`, `.impact-option`, `.impact-badge`, `.impact-dots`, and active states for both light and dark themes.

- [ ] **Step 5: Wire up Logic & Event Row Rendering in `app.js`**
  - Update `openModal()` to initialize selected impact (defaulting to 3 or existing event's impact).
  - Update quick log submission to capture selected quick impact.
  - Update `renderEvents()` and `renderOverviewRecent()` to display the sentiment and impact badge (`☀ Good · Impact 3/5 ●●●○○`).

- [ ] **Step 6: Verify in browser**
  Log an event with "DS exam", Sentiment: Good, Impact: 3.
  Log an event with "Bad weather", Sentiment: Tough, Impact: 1.
  Verify both render properly in Overview and All Events.

---

### Task 2: Data Safety & Category Management (Phase 2)

**Files:**
- Modify: `index.html:28-32` (Category section header & management triggers)
- Modify: `styles.css` (Category edit/delete buttons, color picker swatches in dialog)
- Modify: `app.js:227-245` (Streak DST fix)
- Modify: `app.js:525-539` (Timeline grouping DST fix)
- Modify: `app.js:1015-1037` (Import with Merge vs Replace)
- Modify: `app.js:1132-1154` (Category CRUD management)

**Interfaces:**
- Produces: `importBackup(jsonString, mode)` where `mode` is `"merge"` | `"replace"`.
- Produces: `deleteCategory(categoryName)`, `editCategory(oldName, updatedData)`.

- [ ] **Step 1: Fix DST and Date Calculation Bugs**
  In `app.js`:
  Replace `diff = Math.floor((today - date) / (1000 * 60 * 60 * 24))` with calendar day difference:
  ```javascript
  const msPerDay = 86400000;
  const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const utcDate = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((utcToday - utcDate) / msPerDay);
  ```
  Apply the same calendar comparison in `calculateStreak()` to prevent DST day corruption.

- [ ] **Step 2: Safe Import with Merge vs Replace**
  When importing JSON:
  - If existing events exist, show a custom dialog:
    "You have X existing moments. How would you like to import?"
    Options: **Merge** (appends new and updates existing by ID without deleting) or **Replace All** (creates an automatic backup download first, then replaces).
  - Test with valid and invalid JSON.

- [ ] **Step 3: Full Category Management (Edit & Delete)**
  - Beside each category in the sidebar, add an action or manage menu to:
    - **Rename** category.
    - **Change color** from a vibrant 12-color palette.
    - **Delete** category (with confirmation dialog). If deleted, automatically reassign any events using that category to "Personal" and save.
  - Test creating, renaming, recoloring, and deleting a category.

---

### Task 3: Search Debouncing, Highlighting & Advanced Filters (Phase 3)

**Files:**
- Modify: `index.html:258-279` (Events heading filter tools)
- Modify: `styles.css` (Search highlight styling, date filter dropdown)
- Modify: `app.js:512-524` (Search and filter logic with debounce & highlight)

**Interfaces:**
- Produces: `highlightMatches(text, query)` returning HTML string with `<mark class="search-match">`.
- Produces: `debounce(fn, waitMs)`.

- [ ] **Step 1: Debounce Search Input**
  In `app.js`: create a lightweight `debounce(fn, 150)` and wrap the search input handler so DOM isn't re-rendered on every keystroke.

- [ ] **Step 2: Add Keyword Match Highlighting**
  In `app.js`: when query is non-empty, highlight matched substrings in event title and notes using regex safe-replacement with `<mark class="search-match">`.
  Add matching highlight styles in `styles.css` (with high-contrast background for dark and light modes).

- [ ] **Step 3: Add Date Range Filter**
  In `index.html`: add Date Filter `<select id="date-filter">` with options:
  - All time
  - Today
  - Past 7 days
  - This month
  - Past 30 days
  - This year
  Wire into `visibleEvents()` in `app.js` and initialize custom select.

- [ ] **Step 4: Add Impact Filter**
  In `index.html`: add an Impact Filter selector:
  - All impacts
  - High Impact (4–5)
  - Moderate Impact (3)
  - Low Impact (1–2)
  Wire into `visibleEvents()` in `app.js`.

---

### Task 4: Analytics, 30-Day Activity Chart & Longest Streak (Phase 4)

**Files:**
- Modify: `index.html:86-140` (Stats grid cards)
- Modify: `index.html:188-196` (Chart period selector)
- Modify: `styles.css` (Stat cards & chart styling)
- Modify: `app.js:227-245` (Streak calculation: current + longest)
- Modify: `app.js:429-478` (Stats rendering)
- Modify: `app.js:620-746` (SVG chart generation: 30 days, 6 months, 12 months)

**Interfaces:**
- Produces: `calculateStreaks()` returning `{ current, longest }`.
- Produces: `renderChart()` supporting 30 days (day-by-day / weekly aggregation).

- [ ] **Step 1: Calculate All-Time Longest Streak**
  In `app.js`: enhance streak calculation to sort all unique event dates ascending and compute the maximum consecutive run of days.
  Display in the stats card: `Current: X days · Best: Y days`.

- [ ] **Step 2: Add "Last 30 Days" Activity Chart View**
  Update `#chart-period` with options:
  - Last 30 days
  - Last 6 months
  - Last 12 months
  In `renderChart()`: when 30 days is selected, generate 30 day buckets (or 5-day intervals) with custom date labels, smooth SVG curves, and interactive tooltips.

- [ ] **Step 3: Compute & Display Average Impact**
  In the Sentiment Pulse / Stats card:
  Compute average impact across all logged moments (e.g. `Avg Impact: 3.2 / 5`).
  Highlight high-impact moments (Impact 4 or 5) in a "Major Milestones" chip.

---

### Task 5: Modal Accessibility, Keyboard Polish & Verification (Phase 5)

**Files:**
- Modify: `app.js:871-958` (Modal open/close, focus trapping, focus restoration)
- Modify: `styles.css` (Focus-visible outlines, accessibility improvements)
- Full End-to-End Verification across all files.

**Interfaces:**
- Produces: `trapFocus(modalElement)` and `releaseFocus()`.

- [ ] **Step 1: Modal Focus Trapping & Restoration**
  In `app.js`:
  When opening any modal (`openModal`, `showCustomDialog`, `checkFirstTimeUser`), record `document.activeElement` to restore later.
  Add `keydown` listener inside modal for `Tab`:
  - If focus is on last focusable element and `Tab` (without shift) is pressed, cycle to first focusable element.
  - If focus is on first focusable element and `Shift+Tab` is pressed, cycle to last focusable element.
  On close, return focus to previously recorded element.

- [ ] **Step 2: Keyboard Accessibility for Event Actions**
  Ensure event row edit and delete buttons have distinct `:focus-visible` styles and can be operated via `Enter` or `Space`.

- [ ] **Step 3: End-to-End Verification**
  - Test full flow: Quick Log moment with Sentiment and Impact 1–5.
  - Test detailed Event Modal with notes, category, date, sentiment, and impact.
  - Test category creation, renaming, color editing, and deletion.
  - Test search highlighting and multi-filtering (category, sentiment, date, impact).
  - Test JSON export and safe import (Merge vs Replace).
  - Test chart switching between 30 days, 6 months, 12 months.
  - Verify Light and Dark theme across all views.
  - Verify no console errors.
