# Gather ✳

> **Personal Moment & Event Tracker** — Capture, reflect, and uncover patterns in your daily life.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-emerald.svg)
![Zero Dependencies](https://img.shields.io/badge/dependencies-none-success.svg)

---

## ✨ Features

- **1–5 Impact Rating System**: Rate each moment's impact on your life from `1` (Minor/Routine) to `5` (Major Life Milestone).
- **Sentiment & Mood Tracking**: Tag moments as `Good ☀`, `Normal ◒`, or `Tough ☁`.
- **Streak & Habit Metrics**: Real-time tracking of both your **Current Streak** and **All-Time Longest Streak**.
- **Interactive Visual Charts**: Filter activity across **Last 30 Days**, **Past 6 Months**, and **Past 12 Months**.
- **Powerful Search & Multi-Filters**: 150ms debounced instant search with keyword highlighting, filtered simultaneously by category, sentiment, date range, and impact level.
- **Category Customization**: Color-coded category tags with custom 12-color swatch picker and safe deletion (reassigns events automatically to "Personal").
- **Data Safety & Backups**:
  - Export your entire history to portable JSON.
  - Safe import with **Merge (Keep Both)** or **Replace** (automatically saves a backup before replacing).
  - 100% private: all data is stored locally in your browser/app (`localStorage`).
- **Dark & Light Modes**: Beautiful adaptive theme with system sync and `D` key shortcut.
- **In-App Live Updates**: Update code changes directly from GitHub without re-downloading any executables.

---

## 🚀 How to Run

### Option 1: Standalone Windows App (`Gather.exe`)
Double-click **`Gather.exe`** in the project folder.
- Runs in a clean, chromeless desktop window (no browser tabs, no address bar).
- Ultra-lightweight (only **9.7 KB**).
- You can right-click `Gather.exe` and select **"Pin to taskbar"** or **"Send to Desktop"**.

### Option 2: In Any Browser
Double-click **`index.html`** to run in Google Chrome, Microsoft Edge, Brave, Firefox, or Safari.

### Option 3: On Your Phone (Mobile App / PWA)
Open `index.html` (or your GitHub Pages link) on your phone and tap **"Add to Home Screen"** or **"Install"**. Gather will run full-screen as a mobile application with full offline support.

---

## 🌐 Deploy to GitHub Pages (Free Cloud Link)

1. Push this folder to your GitHub account:
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git branch -M main
   git push -u origin main
   ```
2. On GitHub, go to your repository **Settings** → **Pages**.
3. Under **Branch**, select `main` and click **Save**.
4. Your personal live tracker will be active at:
   `https://<your-username>.github.io/<your-repo-name>/`

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>N</kbd> or <kbd>C</kbd> | Open detailed "Log an event" modal |
| <kbd>/</kbd> | Jump focus to the event search bar |
| <kbd>D</kbd> | Toggle Light / Dark mode |
| <kbd>Esc</kbd> | Close any open modal, dialog, or dropdown |
| <kbd>Tab</kbd> / <kbd>Shift+Tab</kbd> | Accessible modal focus navigation |

---

## 🧪 Testing

Gather has 16 automated tests covering the impact model, date math across DST boundaries, search debouncing, streaks, and modal accessibility:

```bash
node --test tests/*.test.js
```

---

## 📄 License

MIT License. Open source and free for personal and commercial use.
