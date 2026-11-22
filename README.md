# Gather ✳

> **Personal Moment & Event Tracker** — Capture, reflect, and uncover patterns in your daily life.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-2.1.0-emerald.svg)
![Zero Dependencies](https://img.shields.io/badge/dependencies-none-success.svg)
![Automated Tests](https://img.shields.io/badge/tests-32%20passing-brightgreen.svg)

---

## ✨ What's New in v2.1.0

- 🟩 **365-Day Activity Heatmap**: Complete GitHub-style calendar year activity matrix (Jan 1 to Dec 31) with dynamic year switcher, responsive fluid grid (no scrollbars), and clean hover tooltips (`X moments Month Date`).
- ⏳ **"On This Day" Flashback Engine**: Automatically surfaces milestone memories and reflections logged on the exact same date in previous years.
- ⌨️ **Comprehensive Keyboard Shortcuts**:
  - `?`: Toggle shortcut guide modal
  - `Q`: Focus quick-log input
  - `N` or `C`: Open detailed event modal
  - `/`: Focus search
  - `D`: Toggle dark/light theme
  - `G O`: Go to Overview tab
  - `G E`: Go to Events tab
  - `Esc`: Dismiss modals and search
- 🌐 **Desktop Global Hotkey**: Press `Ctrl + Shift + G` from anywhere in Windows to immediately bring Gather to the front and open the Quick Add moment logger.
- 🔄 **Topbar Live Update Status**: Sleek `[ • v2.1.0 ]` topbar pill button with in-app check and clean dialog prompt for seamless updates.
- 📦 **Windows Installer**: One-click setup (`Gather-Setup-x64.exe`) built with Inno Setup. Upgrades cleanly in-place without touching your saved data.

---

## 🌟 Core Features

- **1–5 Impact Rating System**: Rate each moment's significance from `1` (Minor/Routine) to `5` (Major Life Milestone).
- **Sentiment & Mood Tracking**: Tag moments as `Good ☀`, `Normal ◒`, or `Tough ☁`.
- **Streak & Habit Metrics**: Real-time tracking of both your **Current Streak** and **All-Time Longest Streak**.
- **Instant Search & Multi-Filters**: 150ms debounced search with keyword highlighting, filtered simultaneously by category, sentiment, date range, and impact level.
- **Category Customization**: Color-coded category tags with custom 12-color swatch picker and safe deletion (reassigns events automatically).
- **Data Safety & Backups**:
  - Export your entire history to portable JSON.
  - Safe import with **Merge (Keep Both)** or **Replace** (creates an automatic backup before replacing).
  - 100% private: all data is stored locally on your device (`localStorage`).
- **Dark & Light Themes**: Beautiful adaptive theme with system sync and `D` key shortcut.

---

## 🚀 How to Run & Install

### Option 1: Windows Installer (Recommended)
Download **`Gather-Setup-x64.exe`** from [Latest GitHub Releases](https://github.com/yuvrajrode/Event-Tracker/releases/latest).
- Installs Gather to your system with desktop and start menu shortcuts.
- **Upgrades cleanly**: Running a newer installer replaces the app binaries while preserving all your logged moments and settings.

### Option 2: Portable Windows App (`Gather.exe`)
Download **`gather-windows-x64.zip`** (or `Gather.exe` directly).
- Runs in a clean, chromeless desktop window.
- Fully portable: run from anywhere, pin to taskbar, or put on a USB stick.

### Option 3: In Any Web Browser
Double-click **`index.html`** to run locally in Google Chrome, Microsoft Edge, Brave, Firefox, or Safari.

### Option 4: On Your Phone (Mobile App / PWA)
Open `index.html` (or your GitHub Pages link) on mobile and tap **"Add to Home Screen"** or **"Install"**.

---

## 🔄 How to Upgrade (Keeping Your Data Safe)

Your data (events, categories, space name, theme preference) is stored in local persistent storage (`localStorage`).
- When upgrading to a new release, **you do not need to uninstall or delete your old Gather**.
- Simply run the new **`Gather-Setup-x64.exe`** or extract the new executable over the existing directory.
- Your history, streaks, and settings are preserved automatically.
- *Tip:* You can also click **Export JSON** in the topbar at any time to keep a manual JSON backup.

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action |
| :--- | :--- |
| <kbd>?</kbd> | Open Keyboard Shortcuts Cheatsheet |
| <kbd>Q</kbd> | Focus Quick-Add input bar |
| <kbd>N</kbd> or <kbd>C</kbd> | Open detailed "Log an event" modal |
| <kbd>/</kbd> | Jump focus to the event search bar |
| <kbd>D</kbd> | Toggle Light / Dark mode |
| <kbd>G</kbd> then <kbd>O</kbd> | Navigate to Overview tab |
| <kbd>G</kbd> then <kbd>E</kbd> | Navigate to Events tab |
| <kbd>Esc</kbd> | Close any open modal, dialog, or dropdown |
| <kbd>Tab</kbd> / <kbd>Shift+Tab</kbd> | Accessible modal focus navigation |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>G</kbd> | Global Windows hotkey: Bring Gather to front & focus Quick Add |

---

## 🧪 Testing

Gather includes 32 automated tests covering the impact model, date math across DST boundaries, search debouncing, streaks, accessibility focus traps, flashbacks, 365-day calendar heatmap data, shortcut mapping, and semantic version updates:

```bash
node --test tests/*.test.js
```

---

## 📄 License

MIT License. Open source and free for personal and commercial use.
