(() => {
  "use strict";

  const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";
  const storage = isBrowser && typeof localStorage !== "undefined" ? localStorage : {
    _data: {},
    getItem(k) { return this._data[k] ?? null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
  };

  const STORAGE_KEY = "gather.events.v1";
  const CATEGORIES_KEY = "gather.categories.v1";
  const THEME_KEY = "gather.theme.v1";
  const USERNAME_KEY = "gather.username.v1";
  const APP_VERSION = "1.0.0";

  const SENTIMENTS = {
    good: { label: "Good", icon: "☀", className: "good" },
    normal: { label: "Normal", icon: "◒", className: "normal" },
    bad: { label: "Tough", icon: "☁", className: "bad" }
  };

  const IMPACTS = {
    1: { level: 1, label: "Minor", hint: "Routine", dots: "●○○○○" },
    2: { level: 2, label: "Noticeable", hint: "Notable", dots: "●●○○○" },
    3: { level: 3, label: "Moderate", hint: "Meaningful", dots: "●●●○○" },
    4: { level: 4, label: "Significant", hint: "High impact", dots: "●●●●○" },
    5: { level: 5, label: "Major", hint: "Life milestone", dots: "●●●●●" }
  };

  const DEFAULT_CATEGORIES = [
    { name: "Work", color: "#6366f1", icon: "↗", tint: "rgba(99, 102, 241, 0.12)" },
    { name: "Personal", color: "#ec4899", icon: "♡", tint: "rgba(236, 72, 153, 0.12)" },
    { name: "Wellness", color: "#10b981", icon: "✳", tint: "rgba(16, 185, 129, 0.12)" },
    { name: "Social", color: "#f97316", icon: "✦", tint: "rgba(249, 115, 22, 0.12)" },
    { name: "Learning", color: "#eab308", icon: "⌁", tint: "rgba(234, 179, 8, 0.12)" },
    { name: "Travel", color: "#06b6d4", icon: "⌖", tint: "rgba(6, 182, 212, 0.12)" }
  ];

  const $ = (selector) => isBrowser ? document.querySelector(selector) : null;
  const $$ = (selector) => isBrowser ? document.querySelectorAll(selector) : [];

  function loadJson(key, fallback) {
    try {
      const val = storage.getItem(key);
      return val ? JSON.parse(val) : structuredClone(fallback);
    } catch (e) {
      console.error(`Could not read ${key}`, e);
      return structuredClone(fallback);
    }
  }

  function generateId() {
    return (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function localDateString(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function dateFromISO(val) {
    if (!val || typeof val !== "string") return new Date();
    const [y, m, d] = val.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function formatDate(val) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return "Date unknown";
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(dateFromISO(val));
  }

  function formatMonth(date, format = "short") {
    return new Intl.DateTimeFormat(undefined, { month: format }).format(date);
  }

  function escapeHtml(val) {
    return String(val ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  }

  function escapeRegExp(str) {
    return String(str ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlightMatches(text, query) {
    const escaped = escapeHtml(text ?? "");
    if (!query || typeof query !== "string") return escaped;
    const cleanQuery = query.trim();
    if (!cleanQuery) return escaped;

    const regex = new RegExp(`(${escapeRegExp(cleanQuery)})`, "gi");
    return escaped.replace(regex, '<mark class="search-match">$1</mark>');
  }

  function debounce(fn, wait = 150) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function matchesDateFilter(dateStr, filterValue) {
    if (!filterValue || filterValue === "all") return true;
    const today = new Date();
    const eventDate = dateFromISO(dateStr);

    const msPerDay = 86400000;
    const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const utcEvent = Date.UTC(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const dayDiff = Math.round((utcToday - utcEvent) / msPerDay);

    switch (filterValue) {
      case "today":
        return dayDiff === 0;
      case "week":
        return dayDiff >= 0 && dayDiff <= 7;
      case "month":
        return eventDate.getFullYear() === today.getFullYear() && eventDate.getMonth() === today.getMonth();
      case "30days":
        return dayDiff >= 0 && dayDiff <= 30;
      case "year":
        return eventDate.getFullYear() === today.getFullYear();
      default:
        return true;
    }
  }

  function matchesImpactFilter(impact, filterValue) {
    if (!filterValue || filterValue === "all") return true;
    const val = Number(impact) || 3;
    switch (filterValue) {
      case "high":
        return val >= 4;
      case "moderate":
        return val === 3;
      case "low":
        return val <= 2;
      default:
        return true;
    }
  }

  function renderImpactBadge(impact) {
    const parsed = Number(impact);
    const val = Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : 3;
    const def = IMPACTS[val] || IMPACTS[3];
    return `<span class="event-impact impact-${val}" title="Impact: ${val}/5 · ${def.label}">
      <span class="impact-dots" aria-hidden="true">${def.dots}</span>
      <span class="impact-text">${def.label}</span>
    </span>`;
  }

  function normalizeEvent(e) {
    if (!e || typeof e !== "object") return e;
    const sentiment = ["good", "normal", "bad"].includes(e.sentiment)
      ? e.sentiment
      : (e.rating && e.rating <= 2 ? "bad" : "good");

    const parsedImpact = Number(e.impact);
    const impact = Number.isInteger(parsedImpact) && parsedImpact >= 1 && parsedImpact <= 5
      ? parsedImpact
      : 3;

    return {
      id: e.id || generateId(),
      title: e.title || "Untitled moment",
      category: e.category || "Personal",
      date: /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : localDateString(),
      sentiment,
      impact,
      notes: typeof e.notes === "string" ? e.notes : "",
      createdAt: Number.isFinite(e.createdAt) ? e.createdAt : Date.now()
    };
  }

  // Load events and categories (demo data deleted)
  let rawStoredEvents = loadJson(STORAGE_KEY, []);
  let events = (Array.isArray(rawStoredEvents) ? rawStoredEvents : []).map(normalizeEvent);
  let categories = loadJson(CATEGORIES_KEY, DEFAULT_CATEGORIES);

  let selectedSentiment = "good";
  let selectedQuickSentiment = "good";
  let selectedImpact = 3;
  let selectedQuickImpact = 3;
  let activeCategory = "all";
  let activeSentimentFilter = "all";
  let editingId = null;
  let customDialogResolve = null;
  let toastTimer;
  let activeTab = "overview";
  let username = storage.getItem(USERNAME_KEY) || "";

  const els = {
    tabOverview: $("#tab-overview"),
    tabEvents: $("#tab-events"),
    navOverview: $("#nav-overview"),
    navEvents: $("#nav-events"),
    breadcrumbCurrent: $("#breadcrumb-current"),
    gotoEventsBtn: $("#goto-events-btn"),
    eventsTabAddBtn: $("#events-tab-add-btn"),
    overviewRecentList: $("#overview-recent-list"),
    userAvatar: $("#user-avatar"),
    userSpaceName: $("#user-space-name"),
    userSpaceSub: $("#user-space-sub"),
    profileCard: $("#profile-card"),
    onboardingModal: $("#onboarding-modal-backdrop"),
    onboardingForm: $("#onboarding-form"),
    onboardingInput: $("#onboarding-input"),
    categoryNav: $("#category-nav"),
    categoryBreakdown: $("#category-breakdown"),
    categoryFilter: $("#category-filter"),
    dateFilter: $("#date-filter"),
    impactFilter: $("#impact-filter"),
    categorySelect: $("#event-category"),
    quickCategorySelect: $("#quick-category"),
    eventList: $("#event-list"),
    listFooter: $("#list-footer"),
    modalBackdrop: $("#event-modal-backdrop"),
    eventForm: $("#event-form"),
    formError: $("#form-error"),
    title: $("#event-title"),
    date: $("#event-date"),
    notes: $("#event-notes"),
    sentimentPicker: $("#sentiment-picker"),
    impactPicker: $("#impact-picker"),
    modalImpactDesc: $("#modal-impact-desc"),
    chart: $("#activity-chart"),
    chartEmpty: $("#chart-empty"),
    chartTooltip: $("#chart-tooltip"),
    toast: $("#toast"),
    quickForm: $("#quick-add-form"),
    quickTitle: $("#quick-title")
  };

  function saveData() {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(events));
      storage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
      return true;
    } catch (e) {
      console.error("Storage save failed", e);
      showToast("Storage full or unavailable.");
      return false;
    }
  }

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2600);
  }

  function categoryFor(name) {
    return categories.find((c) => c.name === name) || {
      name: name || "Personal",
      color: "#6366f1",
      icon: "✦",
      tint: "rgba(99, 102, 241, 0.12)"
    };
  }

  // USERNAME & SPACE SETUP
  function updateUsernameUI(name) {
    const display = name ? name.trim() : "Your space";
    const initial = (display[0] || "Y").toUpperCase();
    if (els.userSpaceName) els.userSpaceName.textContent = display;
    if (els.userAvatar) els.userAvatar.textContent = initial;
    const eyebrow = $("#welcome-eyebrow");
    if (eyebrow) {
      eyebrow.textContent = name ? `${name.toUpperCase()} · MOMENTUM` : "YOUR PERSONAL MOMENTUM";
    }
  }

  function promptRenameSpace() {
    showCustomDialog({
      title: "Name your space",
      message: "Personalize your workspace name:",
      inputLabel: "Space name",
      inputPlaceholder: "e.g. Rodey's space, Alex",
      confirmLabel: "Save name"
    }).then((newName) => {
      if (newName && typeof newName === "string" && newName.trim()) {
        username = newName.trim();
        storage.setItem(USERNAME_KEY, username);
        updateUsernameUI(username);
        showToast("Space name updated.");
      }
    });
  }

  function checkFirstTimeUser() {
    if (!username) {
      els.onboardingModal.hidden = false;
      document.body.style.overflow = "hidden";
      trapFocus(els.onboardingModal);
      setTimeout(() => els.onboardingInput.focus(), 40);
    } else {
      updateUsernameUI(username);
    }
  }

  // TAB SWITCHING
  function switchTab(tabName) {
    activeTab = tabName === "events" ? "events" : "overview";
    const isEvents = activeTab === "events";

    if (els.tabOverview) els.tabOverview.hidden = isEvents;
    if (els.tabEvents) els.tabEvents.hidden = !isEvents;

    if (els.navOverview) els.navOverview.classList.toggle("active", !isEvents);
    if (els.navEvents) els.navEvents.classList.toggle("active", isEvents);

    if (els.breadcrumbCurrent) els.breadcrumbCurrent.textContent = isEvents ? "All Events" : "Overview";

    if (isEvents) {
      renderEvents();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      renderOverviewRecent();
    }
  }

  function calculateStreaks(eventsList = events) {
    if (!eventsList || !eventsList.length) return { current: 0, longest: 0 };
    const dateSet = new Set(eventsList.map((e) => e.date).filter(Boolean));
    if (!dateSet.size) return { current: 0, longest: 0 };

    const sortedDates = Array.from(dateSet).sort();
    let longest = 0;
    let tempStreak = 0;
    let prevUtc = null;
    const msPerDay = 86400000;

    for (const dStr of sortedDates) {
      const d = dateFromISO(dStr);
      const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
      if (prevUtc === null) {
        tempStreak = 1;
      } else {
        const diff = Math.round((utc - prevUtc) / msPerDay);
        if (diff === 1) {
          tempStreak += 1;
        } else if (diff > 1) {
          tempStreak = 1;
        }
      }
      prevUtc = utc;
      if (tempStreak > longest) longest = tempStreak;
    }

    const today = new Date();
    let currentWalk = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayStr = localDateString(currentWalk);

    if (!dateSet.has(todayStr)) {
      currentWalk.setDate(currentWalk.getDate() - 1);
      if (!dateSet.has(localDateString(currentWalk))) {
        return { current: 0, longest };
      }
    }

    let current = 0;
    while (dateSet.has(localDateString(currentWalk))) {
      current += 1;
      currentWalk.setDate(currentWalk.getDate() - 1);
    }

    return { current, longest: Math.max(longest, current) };
  }

  function calculateStreak() {
    return calculateStreaks(events).current;
  }

  function calculateAverageImpact(eventsList = events) {
    if (!eventsList || !eventsList.length) return "—";
    const sum = eventsList.reduce((acc, e) => {
      const parsed = Number(e.impact);
      const val = Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : 3;
      return acc + val;
    }, 0);
    return (sum / eventsList.length).toFixed(1);
  }

  function get30DayChartBuckets(eventsList = events, referenceDate = new Date()) {
    const buckets = [];
    const ref = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());

    for (let i = 29; i >= 0; i--) {
      const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - i);
      const dateStr = localDateString(d);
      const dayEvents = (eventsList || []).filter((e) => e.date === dateStr);
      buckets.push({
        date: d,
        dateStr,
        label: `${d.getDate()} ${formatMonth(d)}`,
        count: dayEvents.length,
        good: dayEvents.filter((e) => e.sentiment === "good").length,
        normal: dayEvents.filter((e) => e.sentiment === "normal").length,
        bad: dayEvents.filter((e) => e.sentiment === "bad").length
      });
    }

    return buckets;
  }

  // CUSTOM DROPDOWNS SYSTEM (Replaces ugly native OS select popup)
  const customSelectInstances = new Map();

  function initCustomSelect(selectElement, isCategory = false) {
    if (!selectElement) return;
    const parent = selectElement.closest(".select-wrap");
    if (!parent) return;

    selectElement.classList.add("custom-select-hidden");
    const oldChevron = parent.querySelector(":scope > .select-chevron");
    if (oldChevron) oldChevron.remove();

    let trigger = parent.querySelector(".custom-select-trigger");
    let menu = parent.querySelector(".custom-select-menu");

    if (!trigger) {
      trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "custom-select-trigger";
      trigger.setAttribute("aria-haspopup", "listbox");
      trigger.setAttribute("aria-expanded", "false");
      trigger.innerHTML = `
        <span class="custom-select-value">
          <span class="custom-select-dot" style="display:none;"></span>
          <span class="custom-select-label"></span>
        </span>
        <span class="select-chevron" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>`;
      parent.appendChild(trigger);
    }

    if (!menu) {
      menu = document.createElement("div");
      menu.className = "custom-select-menu";
      menu.setAttribute("role", "listbox");
      menu.hidden = true;
      parent.appendChild(menu);
    }

    function sync() {
      const selectedOption = selectElement.selectedOptions[0] || selectElement.options[0];
      const val = selectElement.value;
      const text = selectedOption ? selectedOption.textContent : "";

      const labelEl = trigger.querySelector(".custom-select-label");
      const dotEl = trigger.querySelector(".custom-select-dot");

      if (labelEl) labelEl.textContent = text;

      if (isCategory) {
        if (val === "all") {
          dotEl.style.display = "inline-block";
          dotEl.className = "custom-select-dot all-dot";
          dotEl.style.background = "var(--muted)";
          dotEl.style.boxShadow = "none";
        } else {
          const cat = categoryFor(val);
          dotEl.style.display = "inline-block";
          dotEl.className = "custom-select-dot";
          dotEl.style.background = cat.color;
          dotEl.style.boxShadow = `0 0 0 2px var(--surface), 0 0 6px ${cat.color}66`;
        }
      } else {
        dotEl.style.display = "none";
      }

      menu.innerHTML = Array.from(selectElement.options).map((opt) => {
        const isSel = opt.value === val;
        let dotHtml = "";
        if (isCategory) {
          if (opt.value === "all") {
            dotHtml = `<span class="custom-select-dot all-dot"></span>`;
          } else {
            const c = categoryFor(opt.value);
            dotHtml = `<span class="custom-select-dot" style="background:${c.color};box-shadow:0 0 0 2px var(--surface), 0 0 6px ${c.color}66"></span>`;
          }
        }
        return `
          <div class="custom-select-option ${isSel ? "is-selected" : ""}" role="option" data-value="${escapeHtml(opt.value)}" aria-selected="${isSel}">
            <span class="custom-select-option-left">
              ${dotHtml}
              <span class="custom-select-option-label">${escapeHtml(opt.textContent)}</span>
            </span>
            ${isSel ? `<span class="custom-select-check">✓</span>` : ""}
          </div>`;
      }).join("");
    }

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = menu.hidden;
      document.querySelectorAll(".custom-select-menu").forEach((m) => {
        m.hidden = true;
      });
      document.querySelectorAll(".custom-select-trigger").forEach((t) => {
        t.setAttribute("aria-expanded", "false");
      });

      if (willOpen) {
        menu.hidden = false;
        trigger.setAttribute("aria-expanded", "true");
        const sel = menu.querySelector(".is-selected");
        if (sel) sel.scrollIntoView({ block: "nearest" });
      }
    });

    trigger.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (menu.hidden) {
          trigger.click();
        } else {
          const options = Array.from(menu.querySelectorAll(".custom-select-option"));
          let curIdx = options.findIndex((opt) => opt.classList.contains("is-highlighted") || opt.classList.contains("is-selected"));
          if (e.key === "ArrowDown") curIdx = (curIdx + 1) % options.length;
          else curIdx = (curIdx - 1 + options.length) % options.length;
          options.forEach((opt, i) => opt.classList.toggle("is-highlighted", i === curIdx));
          options[curIdx]?.scrollIntoView({ block: "nearest" });
        }
      } else if (e.key === "Enter" || e.key === " ") {
        if (!menu.hidden) {
          e.preventDefault();
          const highlighted = menu.querySelector(".custom-select-option.is-highlighted") || menu.querySelector(".custom-select-option.is-selected");
          if (highlighted) highlighted.click();
        }
      }
    });

    menu.addEventListener("click", (e) => {
      e.stopPropagation();
      const optionEl = e.target.closest(".custom-select-option");
      if (!optionEl) return;
      const newVal = optionEl.dataset.value;
      if (selectElement.value !== newVal) {
        selectElement.value = newVal;
        selectElement.dispatchEvent(new Event("change", { bubbles: true }));
      }
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      sync();
      trigger.focus();
    });

    customSelectInstances.set(selectElement, { sync, trigger, menu });
    sync();
  }

  function syncCustomSelect(selectElement) {
    if (!selectElement) return;
    const inst = customSelectInstances.get(selectElement);
    if (inst) inst.sync();
  }

  const CATEGORY_PALETTE = [
    "#6366f1", "#ec4899", "#10b981", "#f97316", "#eab308", "#06b6d4",
    "#8b5cf6", "#14b8a6", "#f43f5e", "#3b82f6", "#84cc16", "#a855f7"
  ];

  function renderCategoryControls() {
    const counts = Object.fromEntries(
      categories.map(({ name }) => [name, events.filter((e) => e.category === name).length])
    );

    els.categoryNav.innerHTML = categories.map((cat) => `
      <div class="category-item-row ${activeCategory === cat.name ? "selected" : ""}">
        <a href="#events" class="category-link" data-category="${escapeHtml(cat.name)}">
          <span class="category-color" style="background:${escapeHtml(cat.color)}"></span>
          <span>${escapeHtml(cat.name)}</span>
          <span class="category-link-count">${counts[cat.name] || ""}</span>
        </a>
        <button type="button" class="category-edit-btn" data-edit-category="${escapeHtml(cat.name)}" title="Category settings" aria-label="Settings for ${escapeHtml(cat.name)}">⚙</button>
      </div>`).join("");

    const prevFilter = els.categoryFilter.value || activeCategory;
    els.categoryFilter.innerHTML = `<option value="all">All categories</option>` + categories.map((cat) =>
      `<option value="${escapeHtml(cat.name)}">${escapeHtml(cat.name)}</option>`).join("");
    els.categoryFilter.value = categories.some((c) => c.name === prevFilter) ? prevFilter : "all";

    const catOptions = categories.map((cat) => `<option value="${escapeHtml(cat.name)}">${escapeHtml(cat.name)}</option>`).join("");
    els.categorySelect.innerHTML = catOptions;
    if (els.quickCategorySelect) els.quickCategorySelect.innerHTML = catOptions;

    syncCustomSelect(els.categoryFilter);
    syncCustomSelect(els.categorySelect);
    syncCustomSelect(els.quickCategorySelect);
  }

  function renderStats() {
    const total = events.length;
    const streaks = calculateStreaks(events);
    const streakEl = $("#streak-value");
    const streakLabelEl = $("#streak-label");
    if (streakEl) streakEl.innerHTML = `${streaks.current} <small>days</small>`;
    if (streakLabelEl) {
      const activeText = streaks.current > 0 ? "🔥 Active streak" : "Start logging to build streak";
      streakLabelEl.textContent = streaks.longest > 0 ? `Best: ${streaks.longest}d · ${activeText}` : activeText;
    }

    $("#total-events").textContent = total;

    const goodCount = events.filter((e) => e.sentiment === "good").length;
    const normalCount = events.filter((e) => e.sentiment === "normal").length;
    const badCount = events.filter((e) => e.sentiment === "bad").length;
    const avgImpact = calculateAverageImpact(events);
    const highImpactCount = events.filter((e) => Number(e.impact) >= 4).length;

    const splitGood = $("#split-good");
    const splitNormal = $("#split-normal");
    const splitBad = $("#split-bad");

    if (total > 0) {
      const goodPct = Math.round((goodCount / total) * 100);
      const normalPct = Math.round((normalCount / total) * 100);
      const badPct = Math.max(0, 100 - goodPct - normalPct);

      if (splitGood) splitGood.style.width = `${goodPct}%`;
      if (splitNormal) splitNormal.style.width = `${normalPct}%`;
      if (splitBad) splitBad.style.width = `${badPct}%`;

      $("#average-rating").textContent = `${goodPct}% positive · ${avgImpact}★ impact`;
      $("#sentiment-summary").textContent = `${goodCount} Good · ${normalCount} Normal · ${badCount} Tough · ${highImpactCount} Major`;
    } else {
      if (splitGood) splitGood.style.width = "0%";
      if (splitNormal) splitNormal.style.width = "0%";
      if (splitBad) splitBad.style.width = "0%";
      $("#average-rating").textContent = "—";
      $("#sentiment-summary").textContent = "Across all your events";
    }

    const counts = categories.map((cat) => ({
      name: cat.name,
      count: events.filter((e) => e.category === cat.name).length
    })).sort((a, b) => b.count - a.count);

    $("#top-category").textContent = counts[0]?.count ? counts[0].name : "—";
    $("#top-category-count").textContent = counts[0]?.count ? `${counts[0].count} moments logged` : "Build your first highlight";
    $("#sidebar-event-count").textContent = events.length;
    $("#recent-count").textContent = events.length;
  }

  function renderBreakdown() {
    const totalEvents = events.length;
    const values = categories.map((cat) => ({
      ...cat,
      count: events.filter((e) => e.category === cat.name).length
    })).filter(({ count }) => count > 0).sort((a, b) => b.count - a.count);

    if (!values.length) {
      els.categoryBreakdown.innerHTML = `<div class="category-empty">Your categories will illuminate as you log moments.</div>`;
      return;
    }

    const max = Math.max(...values.map(({ count }) => count));
    els.categoryBreakdown.innerHTML = values.map((cat) => {
      const pct = totalEvents > 0 ? Math.round((cat.count / totalEvents) * 100) : 0;
      const barWidth = Math.max(6, Math.round((cat.count / max) * 100));
      return `
        <div class="breakdown-row" title="${escapeHtml(cat.name)}: ${cat.count} moments (${pct}%)">
          <div class="breakdown-label">
            <span class="breakdown-dot" style="background:${escapeHtml(cat.color)};box-shadow:0 0 0 2px var(--surface), 0 0 8px ${escapeHtml(cat.color)}55"></span>
            <span class="breakdown-name">${escapeHtml(cat.name)}</span>
          </div>
          <div class="breakdown-track">
            <div class="breakdown-fill" style="width:${barWidth}%;background:linear-gradient(90deg, ${escapeHtml(cat.color)}, ${escapeHtml(cat.color)}cc);box-shadow:0 1px 4px ${escapeHtml(cat.color)}33"></div>
          </div>
          <div class="breakdown-stats">
            <span class="breakdown-count">${cat.count}</span>
            <span class="breakdown-pct">${pct}%</span>
          </div>
        </div>`;
    }).join("");
  }

  function visibleEvents() {
    const searchInput = $("#event-search");
    const q = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const filterCat = els.categoryFilter ? els.categoryFilter.value : "all";
    const filterDate = els.dateFilter ? els.dateFilter.value : "all";
    const filterImpact = els.impactFilter ? els.impactFilter.value : "all";

    return events.filter((e) => {
      const matchCat = filterCat === "all" || e.category === filterCat;
      const matchSide = activeCategory === "all" || e.category === activeCategory;
      const matchMood = activeSentimentFilter === "all" || e.sentiment === activeSentimentFilter;
      const matchDate = matchesDateFilter(e.date, filterDate);
      const matchImpact = matchesImpactFilter(e.impact, filterImpact);
      const matchSearch = !q || `${e.title} ${e.category} ${e.notes}`.toLowerCase().includes(q);
      return matchCat && matchSide && matchMood && matchDate && matchImpact && matchSearch;
    }).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }

  function getTimelineGroup(dateStr) {
    const todayStr = localDateString();
    if (dateStr === todayStr) return "Today";

    const today = dateFromISO(todayStr);
    const date = dateFromISO(dateStr);
    const msPerDay = 86400000;
    const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const utcDate = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const diff = Math.round((utcToday - utcDate) / msPerDay);

    if (diff === 1) return "Yesterday";
    if (diff > 1 && diff <= 7) return "This Past Week";
    if (diff > 7 && diff <= 30) return "Earlier This Month";

    return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(date);
  }

  function mergeEvents(existingEvents, incomingEvents) {
    const map = new Map();
    (Array.isArray(existingEvents) ? existingEvents : []).forEach((e) => {
      const norm = normalizeEvent(e);
      map.set(norm.id, norm);
    });

    (Array.isArray(incomingEvents) ? incomingEvents : []).forEach((e) => {
      const norm = normalizeEvent(e);
      map.set(norm.id, norm);
    });

    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }

  function reassignCategoryEvents(eventsList, oldCategoryName, fallbackName = "Personal") {
    return (Array.isArray(eventsList) ? eventsList : []).map((e) => {
      if (e.category === oldCategoryName) {
        return { ...e, category: fallbackName };
      }
      return e;
    });
  }

  function renderEvents() {
    const shown = visibleEvents();
    const searchVal = $("#event-search")?.value.trim() || "";
    const filterCat = els.categoryFilter ? els.categoryFilter.value : "all";
    const filterDate = els.dateFilter ? els.dateFilter.value : "all";
    const filterImpact = els.impactFilter ? els.impactFilter.value : "all";

    const isFiltered = events.length > 0 && (
      activeCategory !== "all" ||
      filterCat !== "all" ||
      activeSentimentFilter !== "all" ||
      filterDate !== "all" ||
      filterImpact !== "all" ||
      searchVal
    );

    if (!shown.length) {
      els.eventList.innerHTML = `
        <div class="empty-list">
          <div class="empty-list-icon">${isFiltered ? "⌕" : "✳"}</div>
          <strong>${isFiltered ? "No matching events" : "No moments logged yet"}</strong>
          <p>${isFiltered ? "Try adjusting your search, impact, or date filter." : "Use the Quick Log on the Overview page or click '+ Log an event' to start."}</p>
          ${!isFiltered ? `<button class="button button-primary" data-empty-add>Log your first event <span aria-hidden="true">↗</span></button>` : ""}
        </div>`;
      els.listFooter.textContent = "";
      return;
    }

    const groups = new Map();
    shown.forEach((event) => {
      const grp = getTimelineGroup(event.date);
      if (!groups.has(grp)) groups.set(grp, []);
      groups.get(grp).push(event);
    });

    let html = "";
    groups.forEach((groupEvents, groupName) => {
      html += `<div class="timeline-group-header"><span>${escapeHtml(groupName)}</span></div>`;
      groupEvents.forEach((event) => {
        const cat = categoryFor(event.category);
        const titleHtml = highlightMatches(event.title, searchVal);
        const notesHtml = event.notes ? `<div class="event-notes">${highlightMatches(event.notes, searchVal)}</div>` : "";
        const sentiment = SENTIMENTS[event.sentiment] || SENTIMENTS.normal;

        html += `
          <article class="event-row">
            <div class="event-main">
              <span class="event-category-icon" style="color:${escapeHtml(cat.color)};background:${escapeHtml(cat.tint)}">${escapeHtml(cat.icon)}</span>
              <div class="event-title-wrap">
                <div class="event-title">${titleHtml}</div>
                ${notesHtml}
              </div>
            </div>
            <span class="event-category">${escapeHtml(event.category)}</span>
            <time class="event-date" datetime="${escapeHtml(event.date)}">${escapeHtml(formatDate(event.date))}</time>
            <div class="event-meta-badges">
              <span class="event-sentiment ${sentiment.className}">${sentiment.icon} ${sentiment.label}</span>
              ${renderImpactBadge(event.impact)}
            </div>
            <span class="event-actions">
              <button class="event-action" data-edit="${escapeHtml(event.id)}" aria-label="Edit" title="Edit">✎</button>
              <button class="event-action" data-delete="${escapeHtml(event.id)}" aria-label="Delete" title="Delete">×</button>
            </span>
          </article>`;
      });
    });

    els.eventList.innerHTML = html;
    els.listFooter.textContent = `Showing ${shown.length} of ${events.length} moments`;
  }

  function renderOverviewRecent() {
    if (!els.overviewRecentList) return;
    const sorted = [...events].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 3);

    if (!sorted.length) {
      els.overviewRecentList.innerHTML = `<div class="overview-recent-empty">No moments logged yet. Use the Quick Log above to record your first moment!</div>`;
      return;
    }

    els.overviewRecentList.innerHTML = sorted.map((item) => {
      const cat = categoryFor(item.category);
      const s = SENTIMENTS[item.sentiment] || SENTIMENTS.good;
      return `
        <div class="overview-recent-item">
          <div class="overview-recent-left">
            <span class="event-category-icon" style="color:${escapeHtml(cat.color)};background:${escapeHtml(cat.tint)}">${escapeHtml(cat.icon)}</span>
            <div>
              <div class="overview-recent-item-title">${escapeHtml(item.title)}</div>
              <div class="overview-recent-item-meta">${escapeHtml(cat.name)} · ${escapeHtml(formatDate(item.date))}</div>
            </div>
          </div>
          <div class="event-meta-badges">
            <span class="event-sentiment ${s.className}">${s.icon} ${s.label}</span>
            ${renderImpactBadge(item.impact)}
          </div>
        </div>`;
    }).join("");
  }

  function renderChart() {
    const periodValue = $("#chart-period") ? $("#chart-period").value : "6";
    const is30Days = periodValue === "30";
    const now = new Date();

    let chartData;
    let totalCount;
    let avgCount;
    let peakCount = 0;
    let peakName = "-";

    if (is30Days) {
      chartData = get30DayChartBuckets(events, now);
      const counts = chartData.map((d) => d.count);
      totalCount = counts.reduce((acc, c) => acc + c, 0);
      avgCount = (totalCount / 30).toFixed(1);
      chartData.forEach((d) => {
        if (d.count > peakCount) {
          peakCount = d.count;
          peakName = `${d.label} (${d.count})`;
        }
      });
    } else {
      const numberOfMonths = Number(periodValue) || 6;
      const months = Array.from({ length: numberOfMonths }, (_, i) =>
        new Date(now.getFullYear(), now.getMonth() - numberOfMonths + i + 1, 1)
      );

      chartData = months.map((month) => {
        const mEvents = events.filter((e) => {
          const d = dateFromISO(e.date);
          return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth();
        });
        return {
          month,
          label: formatMonth(month),
          fullLabel: formatMonth(month, "long"),
          count: mEvents.length,
          good: mEvents.filter((e) => e.sentiment === "good").length,
          normal: mEvents.filter((e) => e.sentiment === "normal").length,
          bad: mEvents.filter((e) => e.sentiment === "bad").length
        };
      });

      const counts = chartData.map((d) => d.count);
      totalCount = counts.reduce((acc, c) => acc + c, 0);
      avgCount = (totalCount / numberOfMonths).toFixed(1);
      chartData.forEach((d) => {
        if (d.count > peakCount) {
          peakCount = d.count;
          peakName = `${d.label} (${d.count})`;
        }
      });
    }

    const totalEl = $("#chart-stat-total");
    const avgEl = $("#chart-stat-avg");
    const peakEl = $("#chart-stat-peak");
    if (totalEl) totalEl.textContent = totalCount;
    if (avgEl) avgEl.textContent = avgCount;
    if (peakEl) peakEl.textContent = peakCount > 0 ? peakName : "-";

    const counts = chartData.map((d) => d.count);
    const numberOfPoints = chartData.length;
    const width = 680, height = 195, left = 38, right = 16, top = 20, bottom = 32;
    const maxCount = Math.max(4, Math.ceil(Math.max(...counts, 0) / 4) * 4);
    const chartHeight = height - top - bottom, chartWidth = width - left - right;
    const baseline = height - bottom;

    const x = (i) => left + (numberOfPoints === 1 ? chartWidth / 2 : (i * chartWidth) / (numberOfPoints - 1));
    const y = (val) => top + chartHeight - (val / maxCount) * chartHeight;

    const pts = counts.map((c, i) => ({ x: x(i), y: y(c) }));

    function getCurvedPath(points) {
      if (!points.length) return "";
      if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
      let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(points.length - 1, i + 2)];
        let cp1x = p1.x + (p2.x - p0.x) / 6;
        let cp1y = p1.y + (p2.y - p0.y) / 6;
        let cp2x = p2.x - (p3.x - p1.x) / 6;
        let cp2y = p2.y - (p3.y - p1.y) / 6;
        if (p1.y === baseline && p2.y === baseline) {
          cp1y = baseline;
          cp2y = baseline;
        } else {
          cp1y = Math.min(baseline, Math.max(top, cp1y));
          cp2y = Math.min(baseline, Math.max(top, cp2y));
        }
        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
      }
      return d;
    }

    const curvedLine = getCurvedPath(pts);
    const curvedArea = `${curvedLine} L ${pts[pts.length - 1].x.toFixed(1)} ${baseline.toFixed(1)} L ${pts[0].x.toFixed(1)} ${baseline.toFixed(1)} Z`;

    const grid = Array.from({ length: 5 }, (_, i) => {
      const val = maxCount - (i * maxCount) / 4;
      const yPos = y(val);
      return `
        <line class="chart-gridline" x1="${left}" y1="${yPos.toFixed(1)}" x2="${(width - right).toFixed(1)}" y2="${yPos.toFixed(1)}"></line>
        <text class="chart-y-label" x="${left - 10}" y="${(yPos + 3).toFixed(1)}" text-anchor="end">${Math.round(val)}</text>`;
    }).join("");

    const labels = chartData.map((d, i) => {
      let showLabel = false;
      if (is30Days) {
        showLabel = i % 6 === 0 || i === numberOfPoints - 1;
      } else {
        const labelStep = numberOfPoints === 6 ? 1 : 2;
        showLabel = i % labelStep === 0 || i === numberOfPoints - 1;
      }
      if (!showLabel) return "";
      const isCur = i === numberOfPoints - 1;
      return `<text class="chart-label ${isCur ? "current-month" : ""}" x="${x(i).toFixed(1)}" y="${height - 8}" text-anchor="middle">${escapeHtml(d.label)}</text>`;
    }).join("");

    const crosshair = `<line class="chart-crosshair-line" id="chart-crosshair" x1="${left}" y1="${top}" x2="${left}" y2="${baseline}"></line>`;

    const marks = chartData.map((d, i) => `
      <g class="chart-point-group" data-point-idx="${i}">
        <circle class="chart-point-hit" cx="${x(i).toFixed(1)}" cy="${y(d.count).toFixed(1)}" r="18" data-point-idx="${i}"></circle>
        <circle class="chart-point" data-point-idx="${i}" cx="${x(i).toFixed(1)}" cy="${y(d.count).toFixed(1)}" r="${is30Days ? 3.5 : 4.5}">
          <title>${escapeHtml(d.fullLabel || d.label)}: ${d.count} moments</title>
        </circle>
      </g>`).join("");

    els.chart.innerHTML = `
      <defs>
        <linearGradient id="chartCurvedFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="var(--brand)" stop-opacity="0.32"></stop>
          <stop offset="65%" stop-color="var(--brand)" stop-opacity="0.06"></stop>
          <stop offset="100%" stop-color="var(--brand)" stop-opacity="0.00"></stop>
        </linearGradient>
      </defs>
      ${grid}
      ${crosshair}
      <path class="chart-area" d="${curvedArea}"></path>
      <path class="chart-line-glow" d="${curvedLine}"></path>
      <path class="chart-line" d="${curvedLine}"></path>
      ${marks}
      ${labels}`;

    els.chart.setAttribute("viewBox", `0 0 ${width} ${height}`);
    els.chartEmpty.hidden = events.length > 0;
    els.chart.hidden = events.length === 0;

    attachChartInteractions(chartData, x, y);
  }

  function attachChartInteractions(chartData, xFn, yFn) {
    const groups = els.chart.querySelectorAll(".chart-point-group");
    const crosshair = els.chart.querySelector("#chart-crosshair");

    groups.forEach((group) => {
      const idx = Number(group.dataset.pointIdx);
      const data = chartData[idx];
      const pointCircle = group.querySelector(".chart-point");
      if (!data) return;

      const onEnter = () => {
        if (!els.chartTooltip) return;
        const rect = els.chart.getBoundingClientRect();
        const svgBox = els.chart.viewBox.baseVal;
        const scaleX = rect.width / (svgBox.width || 680);
        const scaleY = rect.height / (svgBox.height || 195);

        const pointX = xFn(idx);
        const pointY = yFn(data.count);

        if (crosshair) {
          crosshair.setAttribute("x1", pointX.toFixed(1));
          crosshair.setAttribute("x2", pointX.toFixed(1));
          crosshair.style.opacity = "0.75";
        }
        if (pointCircle) pointCircle.classList.add("active");

        els.chartTooltip.hidden = false;
        els.chartTooltip.style.left = `${pointX * scaleX}px`;
        els.chartTooltip.style.top = `${pointY * scaleY}px`;
        els.chartTooltip.innerHTML = `
          <div class="chart-tooltip-header">
            <span>${escapeHtml(data.fullLabel || data.label)}</span>
            <span class="chart-tooltip-count">${data.count} ${data.count === 1 ? "moment" : "moments"}</span>
          </div>
          <div class="chart-tooltip-pills">
            <span class="chart-tooltip-pill good">☀ ${data.good} Good</span>
            <span class="chart-tooltip-pill normal">◒ ${data.normal} Normal</span>
            <span class="chart-tooltip-pill bad">☁ ${data.bad} Tough</span>
          </div>`;
      };

      const onLeave = () => {
        if (crosshair) crosshair.style.opacity = "0";
        if (pointCircle) pointCircle.classList.remove("active");
        if (els.chartTooltip) els.chartTooltip.hidden = true;
      };

      group.addEventListener("mouseenter", onEnter);
      group.addEventListener("mouseleave", onLeave);
    });
  }

  function render() {
    renderCategoryControls();
    renderStats();
    renderBreakdown();
    renderChart();
    if (activeTab === "events") {
      renderEvents();
    } else {
      renderOverviewRecent();
    }
  }

  // Quick Add Form Submit
  if (els.quickForm) {
    els.quickForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = els.quickTitle.value.trim();
      if (!title) {
        els.quickTitle.focus();
        return;
      }

      const category = els.quickCategorySelect ? els.quickCategorySelect.value : categories[0]?.name;
      const newEvent = {
        id: generateId(),
        title,
        category: category || "Personal",
        date: localDateString(),
        sentiment: selectedQuickSentiment,
        impact: selectedQuickImpact,
        notes: "",
        createdAt: Date.now()
      };

      events = [newEvent, ...events];
      saveData();
      els.quickTitle.value = "";
      render();
      showToast("Moment recorded! ⚡");
    });
  }

  // Quick Sentiment Toggle
  $$("[data-quick-sentiment]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedQuickSentiment = btn.dataset.quickSentiment;
      $$("[data-quick-sentiment]").forEach((b) => {
        const isSel = b.dataset.quickSentiment === selectedQuickSentiment;
        b.classList.toggle("selected", isSel);
        b.setAttribute("aria-checked", String(isSel));
      });
    });
  });

  // Quick Impact Toggle (1 to 5)
  $$("[data-quick-impact]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedQuickImpact = Number(btn.dataset.quickImpact) || 3;
      $$("[data-quick-impact]").forEach((b) => {
        const isSel = Number(b.dataset.quickImpact) === selectedQuickImpact;
        b.classList.toggle("selected", isSel);
        b.setAttribute("aria-checked", String(isSel));
      });
    });
  });

  // Sentiment Filter Chips
  $$("[data-sentiment-filter]").forEach((chip) => {
    chip.addEventListener("click", () => {
      activeSentimentFilter = chip.dataset.sentimentFilter;
      $$("[data-sentiment-filter]").forEach((c) => c.classList.toggle("active", c === chip));
      renderEvents();
    });
  });

  function renderSentimentPicker() {
    els.sentimentPicker.innerHTML = Object.entries(SENTIMENTS).map(([val, s]) => `
      <button type="button" class="sentiment-option ${s.className} ${selectedSentiment === val ? "selected" : ""}" data-sentiment="${val}" role="radio" aria-checked="${selectedSentiment === val}">
        <span aria-hidden="true">${s.icon}</span>${s.label}
      </button>`
    ).join("");
  }

  function renderImpactPicker() {
    if (!els.impactPicker) return;
    els.impactPicker.innerHTML = Object.values(IMPACTS).map((imp) => {
      const isSel = selectedImpact === imp.level;
      return `
        <button type="button" class="impact-option ${isSel ? "selected" : ""}" data-impact="${imp.level}" role="radio" aria-checked="${String(isSel)}" title="Level ${imp.level} · ${imp.label}">
          <span class="impact-num">${imp.level}</span>
          <span class="impact-name">${escapeHtml(imp.label)}</span>
          <span class="impact-dots-mini">${escapeHtml(imp.dots)}</span>
        </button>`;
    }).join("");

    if (els.modalImpactDesc) {
      const def = IMPACTS[selectedImpact] || IMPACTS[3];
      els.modalImpactDesc.textContent = `Level ${selectedImpact} · ${def.label}`;
    }
  }

  const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]):not([hidden]), input:not([disabled]):not([hidden]):not([type="hidden"]), select:not([disabled]):not([hidden]), textarea:not([disabled]):not([hidden]), [tabindex]:not([tabindex="-1"])';

  function getFocusableSelectors() {
    return FOCUSABLE_SELECTOR;
  }

  function getNextFocusableIndex(currentIndex, totalElements, isShiftTab) {
    if (totalElements <= 0) return 0;
    if (currentIndex < 0) {
      return isShiftTab ? totalElements - 1 : 0;
    }
    if (isShiftTab) {
      return currentIndex <= 0 ? totalElements - 1 : currentIndex - 1;
    }
    return currentIndex >= totalElements - 1 ? 0 : currentIndex + 1;
  }

  let focusTrapStack = [];

  function trapFocus(modalEl) {
    if (!modalEl || typeof document === "undefined") return;
    const prevFocus = document.activeElement || null;

    const trapHandler = (e) => {
      if (e.key !== "Tab") return;
      if (modalEl.hidden) return;

      const focusableSelector = getFocusableSelectors();
      const rawElements = Array.from(modalEl.querySelectorAll(focusableSelector));
      const focusables = rawElements.filter((el) => {
        return !el.disabled && !el.hidden && el.style.display !== "none" && (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0);
      });

      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const currentIndex = focusables.indexOf(document.activeElement);
      const nextIndex = getNextFocusableIndex(currentIndex, focusables.length, e.shiftKey);
      focusables[nextIndex].focus();
      e.preventDefault();
    };

    document.addEventListener("keydown", trapHandler);
    focusTrapStack.push({ modalEl, prevFocus, trapHandler });
  }

  function releaseFocus() {
    if (focusTrapStack.length === 0) return;
    const { modalEl, prevFocus, trapHandler } = focusTrapStack.pop();
    if (trapHandler && typeof document !== "undefined") {
      document.removeEventListener("keydown", trapHandler);
    }
    if (prevFocus && typeof prevFocus.focus === "function") {
      try {
        if (typeof document !== "undefined" && document.body.contains(prevFocus)) {
          prevFocus.focus();
        }
      } catch (_) {}
    }
  }

  function openModal(event = null) {
    editingId = event?.id ?? null;
    $("#modal-title").textContent = event ? "Edit event" : "Log an event";
    $("#save-event-button").innerHTML = event ? "Save changes <span aria-hidden=\"true\">↗</span>" : "Save event <span aria-hidden=\"true\">↗</span>";

    els.title.value = event?.title || "";
    els.categorySelect.value = event?.category || categories[0]?.name || "Personal";
    syncCustomSelect(els.categorySelect);
    els.date.value = event?.date || localDateString();
    els.notes.value = event?.notes || "";
    selectedSentiment = event?.sentiment || "good";
    selectedImpact = Number(event?.impact) || 3;
    els.formError.textContent = "";

    renderSentimentPicker();
    renderImpactPicker();
    els.modalBackdrop.hidden = false;
    document.body.style.overflow = "hidden";
    trapFocus(els.modalBackdrop);
    setTimeout(() => els.title.focus(), 30);
  }

  function closeModal() {
    els.modalBackdrop.hidden = true;
    document.body.style.overflow = "";
    editingId = null;
    releaseFocus();
  }

  function applyTheme(theme) {
    const dark = theme === "dark";
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? "#0d0e15" : "#f8f9fd";

    const toggle = $("#theme-toggle");
    if (toggle) {
      toggle.setAttribute("aria-pressed", String(dark));
      toggle.title = `Switch to ${dark ? "light" : "dark"} mode`;
      const icon = toggle.querySelector(".theme-toggle-icon");
      const label = toggle.querySelector(".theme-toggle-label");
      if (icon) icon.textContent = dark ? "☀" : "☾";
      if (label) label.textContent = dark ? "Light mode" : "Dark mode";
    }
  }

  function toggleTheme() {
    const current = document.documentElement.dataset.theme || "light";
    const next = current === "dark" ? "light" : "dark";
    try {
      storage.setItem(THEME_KEY, next);
    } catch (e) {
      console.error(e);
    }
    applyTheme(next);
  }

  function resolveCustomDialog(val) {
    const backdrop = $("#custom-dialog-backdrop");
    backdrop.hidden = true;
    document.body.style.overflow = "";
    releaseFocus();
    const res = customDialogResolve;
    customDialogResolve = null;
    if (res) res(val);
  }

  let customDialogSelectedColor = null;

  function showCustomDialog({
    title,
    message,
    inputLabel = "",
    inputPlaceholder = "",
    inputValue = "",
    confirmLabel = "Confirm",
    secondaryLabel = "",
    secondaryDestructive = false,
    destructive = false,
    colors = null,
    selectedColor = null
  }) {
    const backdrop = $("#custom-dialog-backdrop");
    const input = $("#custom-dialog-input");
    const secondaryBtn = $("#custom-dialog-secondary");
    const colorsWrap = $("#custom-dialog-colors");
    const swatchesEl = $("#color-swatches");

    $("#custom-dialog-title").textContent = title;
    $("#custom-dialog-message").textContent = message;
    $("#custom-dialog-confirm").textContent = confirmLabel;
    $("#custom-dialog-confirm").classList.toggle("button-danger", destructive);
    $("#custom-dialog-cancel").hidden = false;
    $("#custom-dialog-input-label").textContent = inputLabel;
    $("#custom-dialog-input-label").hidden = !inputLabel;
    $("#custom-dialog-error").hidden = true;

    if (secondaryBtn) {
      secondaryBtn.hidden = !secondaryLabel;
      secondaryBtn.textContent = secondaryLabel;
      secondaryBtn.classList.toggle("button-danger", secondaryDestructive);
    }

    input.hidden = !inputLabel;
    input.value = inputValue || "";
    input.placeholder = inputPlaceholder;

    customDialogSelectedColor = selectedColor || (colors ? colors[0] : null);
    if (colorsWrap && swatchesEl) {
      colorsWrap.hidden = !colors;
      if (colors) {
        swatchesEl.innerHTML = colors.map((col) => `
          <button type="button" class="color-swatch ${col === customDialogSelectedColor ? "selected" : ""}" data-color="${col}" style="background:${col}" aria-label="Color ${col}"></button>
        `).join("");
      }
    }

    backdrop.hidden = false;
    document.body.style.overflow = "hidden";
    trapFocus(backdrop);

    const p = new Promise((resolve) => { customDialogResolve = resolve; });
    setTimeout(() => (inputLabel ? input : $("#custom-dialog-confirm")).focus(), 25);
    return p;
  }

  function closeCustomDialog() {
    resolveCustomDialog(null);
  }

  if (isBrowser) {
    // TAB EVENTS & NAVIGATION
    els.navOverview?.addEventListener("click", (e) => {
      e.preventDefault();
      switchTab("overview");
    });

  els.navEvents?.addEventListener("click", (e) => {
    e.preventDefault();
    switchTab("events");
  });

  els.gotoEventsBtn?.addEventListener("click", () => {
    switchTab("events");
  });

  els.eventsTabAddBtn?.addEventListener("click", () => {
    openModal();
  });

  // PROFILE CLICK (RENAME SPACE)
  els.profileCard?.addEventListener("click", promptRenameSpace);
  els.profileCard?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      promptRenameSpace();
    }
  });

  // ONBOARDING FORM SUBMIT
  els.onboardingForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = els.onboardingInput.value.trim();
    username = val || "Your space";
    storage.setItem(USERNAME_KEY, username);
    updateUsernameUI(username);
    els.onboardingModal.hidden = true;
    document.body.style.overflow = "";
    releaseFocus();
    showToast(`Welcome to ${username}! ✳`);
  });

  function exportData(isAutoBackup = false) {
    const backup = { format: "gather-events", version: 1, exportedAt: new Date().toISOString(), categories, events };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = isAutoBackup
      ? `gather-backup-before-replace-${localDateString()}.json`
      : `gather-events-${localDateString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    if (!isAutoBackup) showToast("Events exported to JSON.");
  }

  // LISTENERS
  $("#open-event-modal")?.addEventListener("click", () => openModal());
  $("#theme-toggle")?.addEventListener("click", toggleTheme);

  $("#export-button")?.addEventListener("click", () => exportData(false));

  $("#import-button")?.addEventListener("click", () => $("#import-file")?.click());
  $("#import-file")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const incoming = Array.isArray(parsed) ? parsed : parsed.events || [];
      if (!Array.isArray(incoming)) throw new Error("Invalid file structure");

      if (events.length > 0) {
        const choice = await showCustomDialog({
          title: "Import Moments",
          message: `Found ${incoming.length} moments in file. You currently have ${events.length} saved. How would you like to proceed?`,
          confirmLabel: "Merge (Keep Both)",
          secondaryLabel: "Replace All",
          secondaryDestructive: true
        });

        if (!choice) {
          e.target.value = "";
          return;
        }

        if (choice === "secondary") {
          exportData(true);
          events = incoming.map(normalizeEvent);
          if (Array.isArray(parsed.categories) && parsed.categories.length) {
            categories = parsed.categories;
          }
          saveData();
          render();
          showToast(`Replaced with ${events.length} imported moments (backup saved).`);
        } else {
          events = mergeEvents(events, incoming);
          if (Array.isArray(parsed.categories)) {
            parsed.categories.forEach((c) => {
              if (c && c.name && !categories.some((ex) => ex.name.toLowerCase() === c.name.toLowerCase())) {
                categories.push(c);
              }
            });
          }
          saveData();
          render();
          showToast(`Merged successfully! Total moments: ${events.length}.`);
        }
      } else {
        events = incoming.map(normalizeEvent);
        if (Array.isArray(parsed.categories) && parsed.categories.length) {
          categories = parsed.categories;
        }
        saveData();
        render();
        showToast(`${events.length} events imported.`);
      }
    } catch (err) {
      console.error(err);
      showToast("Could not import file: Invalid JSON structure.");
    }
    e.target.value = "";
  });

  // Modal Actions
  $$("[data-close-modal]").forEach((b) => b.addEventListener("click", closeModal));
  els.modalBackdrop.addEventListener("click", (e) => {
    if (e.target === els.modalBackdrop) closeModal();
  });

  els.sentimentPicker?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-sentiment]");
    if (!btn) return;
    selectedSentiment = btn.dataset.sentiment;
    renderSentimentPicker();
  });

  els.impactPicker?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-impact]");
    if (!btn) return;
    selectedImpact = Number(btn.dataset.impact) || 3;
    renderImpactPicker();
  });

  els.eventForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = els.title.value.trim();
    const date = els.date.value;
    if (!title || !date) {
      els.formError.textContent = "Please enter a title and date.";
      return;
    }

    const existing = editingId ? events.find((i) => i.id === editingId) : null;
    const item = {
      id: existing?.id || generateId(),
      title,
      category: els.categorySelect.value,
      date,
      sentiment: selectedSentiment,
      impact: selectedImpact,
      notes: els.notes.value.trim(),
      createdAt: existing?.createdAt || Date.now()
    };

    if (existing) {
      events = events.map((i) => i.id === editingId ? item : i);
    } else {
      events = [item, ...events];
    }

    saveData();
    closeModal();
    render();
    showToast(existing ? "Event updated." : "Event logged! ✳");
  });

  els.categoryNav.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-edit-category]");
    if (editBtn) {
      e.preventDefault();
      e.stopPropagation();
      const catName = editBtn.dataset.editCategory;
      const cat = categories.find((c) => c.name === catName);
      if (!cat) return;

      const isPersonal = cat.name === "Personal";
      const affectedCount = events.filter((ev) => ev.category === cat.name).length;

      const result = await showCustomDialog({
        title: `Edit Category: ${cat.name}`,
        message: isPersonal
          ? "Default category name and color can be updated:"
          : `Customize name and color, or delete (${affectedCount} moments in this category):`,
        inputLabel: "Category name",
        inputValue: cat.name,
        confirmLabel: "Save changes",
        secondaryLabel: isPersonal ? "" : "Delete Category",
        secondaryDestructive: true,
        colors: CATEGORY_PALETTE,
        selectedColor: cat.color
      });

      if (!result) return;

      if (result === "secondary" && !isPersonal) {
        const confirmDelete = await showCustomDialog({
          title: `Delete category "${cat.name}"?`,
          message: affectedCount > 0
            ? `${affectedCount} moments currently in "${cat.name}" will be safely reassigned to "Personal".`
            : `Are you sure you want to delete "${cat.name}"?`,
          confirmLabel: "Delete category",
          destructive: true
        });

        if (!confirmDelete) return;

        events = reassignCategoryEvents(events, cat.name, "Personal");
        categories = categories.filter((c) => c.name !== cat.name);
        if (activeCategory === cat.name) activeCategory = "all";
        saveData();
        render();
        showToast(`Category "${cat.name}" deleted.`);
        return;
      }

      if (typeof result === "object" && result.value) {
        const newName = result.value.trim();
        const newColor = result.color || cat.color;

        if (newName.toLowerCase() !== cat.name.toLowerCase() && categories.some((c) => c.name.toLowerCase() === newName.toLowerCase())) {
          showToast("A category with that name already exists.");
          return;
        }

        const oldName = cat.name;
        cat.name = newName;
        cat.color = newColor;
        cat.tint = `${newColor}18`;

        if (oldName !== newName) {
          events = events.map((ev) => ev.category === oldName ? { ...ev, category: newName } : ev);
          if (activeCategory === oldName) activeCategory = newName;
        }

        saveData();
        render();
        showToast("Category updated.");
      }
      return;
    }

    const link = e.target.closest("[data-category]");
    if (!link) return;
    e.preventDefault();
    activeCategory = activeCategory === link.dataset.category ? "all" : link.dataset.category;
    els.categoryFilter.value = activeCategory;
    renderCategoryControls();
    switchTab("events");
  });

  els.categoryFilter?.addEventListener("change", () => {
    activeCategory = els.categoryFilter.value;
    renderCategoryControls();
    renderEvents();
  });

  els.dateFilter?.addEventListener("change", renderEvents);
  els.impactFilter?.addEventListener("change", renderEvents);

  const debouncedRenderEvents = debounce(renderEvents, 150);
  $("#event-search")?.addEventListener("input", debouncedRenderEvents);
  $("#chart-period").addEventListener("change", renderChart);

  els.eventList.addEventListener("click", async (e) => {
    if (e.target.closest("[data-empty-add]")) {
      openModal();
      return;
    }
    const editBtn = e.target.closest("[data-edit]");
    if (editBtn) {
      const item = events.find((i) => i.id === editBtn.dataset.edit);
      if (item) openModal(item);
      return;
    }
    const delBtn = e.target.closest("[data-delete]");
    if (delBtn) {
      const item = events.find((i) => i.id === delBtn.dataset.delete);
      if (!item) return;
      const ok = await showCustomDialog({
        title: "Delete event?",
        message: `“${item.title}” will be permanently removed.`,
        confirmLabel: "Delete",
        destructive: true
      });
      if (!ok) return;
      events = events.filter((i) => i.id !== item.id);
      saveData();
      render();
      showToast("Event deleted.");
    }
  });

  $("#add-category-button")?.addEventListener("click", async () => {
    const result = await showCustomDialog({
      title: "Add Category",
      message: "Enter a category name and pick a color:",
      inputLabel: "Category name",
      inputPlaceholder: "e.g. Hobbies, Health, Reading",
      confirmLabel: "Add Category",
      colors: CATEGORY_PALETTE,
      selectedColor: CATEGORY_PALETTE[categories.length % CATEGORY_PALETTE.length]
    });
    if (!result || typeof result !== "object") return;
    const trimmed = result.value ? result.value.trim() : "";
    if (!trimmed || trimmed.length > 30) return;
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      showToast("That category already exists.");
      return;
    }
    const color = result.color || CATEGORY_PALETTE[categories.length % CATEGORY_PALETTE.length];
    categories.push({ name: trimmed, color, icon: "✦", tint: `${color}18` });
    saveData();
    render();
    showToast(`Category "${trimmed}" added! ✳`);
  });

  $("#color-swatches")?.addEventListener("click", (e) => {
    const swatch = e.target.closest("[data-color]");
    if (!swatch) return;
    customDialogSelectedColor = swatch.dataset.color;
    $$(".color-swatch").forEach((s) => s.classList.toggle("selected", s.dataset.color === customDialogSelectedColor));
  });

  $("#custom-dialog-secondary")?.addEventListener("click", () => {
    resolveCustomDialog("secondary");
  });

  $("#custom-dialog-confirm")?.addEventListener("click", () => {
    const input = $("#custom-dialog-input");
    if (!input.hidden && !input.value.trim()) {
      $("#custom-dialog-error").textContent = "Please enter a value.";
      $("#custom-dialog-error").hidden = false;
      input.focus();
      return;
    }
    if (input.hidden) {
      resolveCustomDialog(true);
    } else {
      resolveCustomDialog({
        value: input.value.trim(),
        color: customDialogSelectedColor
      });
    }
  });
  $("#custom-dialog-cancel")?.addEventListener("click", closeCustomDialog);
  $("#custom-dialog-close")?.addEventListener("click", closeCustomDialog);
  $("#custom-dialog-backdrop")?.addEventListener("click", (e) => {
    if (e.target === $("#custom-dialog-backdrop")) closeCustomDialog();
  });

  document.addEventListener("keydown", (e) => {
    const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);

    if (e.key === "Escape") {
      if (!$("#custom-dialog-backdrop").hidden) closeCustomDialog();
      else if (!els.modalBackdrop.hidden) closeModal();
      return;
    }

    if (!isTyping) {
      if (e.key === "n" || e.key === "N" || e.key === "c" || e.key === "C") {
        e.preventDefault();
        openModal();
      } else if (e.key === "/") {
        e.preventDefault();
        switchTab("events");
        setTimeout(() => $("#event-search")?.focus(), 50);
      } else if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        toggleTheme();
      }
    }
  });

  const todayLabel = $("#today-label");
  if (todayLabel) {
    todayLabel.textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date());
  }

  // Handle URL hash on initial load
  window.addEventListener("hashchange", () => {
    const target = window.location.hash === "#events" ? "events" : "overview";
    switchTab(target);
  });

  // Global click outside to close custom dropdowns
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".select-wrap")) {
      document.querySelectorAll(".custom-select-menu").forEach((m) => {
        m.hidden = true;
      });
      document.querySelectorAll(".custom-select-trigger").forEach((t) => {
        t.setAttribute("aria-expanded", "false");
      });
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".custom-select-menu").forEach((m) => {
        m.hidden = true;
      });
      document.querySelectorAll(".custom-select-trigger").forEach((t) => {
        t.setAttribute("aria-expanded", "false");
      });
    }
  });

    // Initialize
    initCustomSelect($("#chart-period"), false);
    initCustomSelect(els.quickCategorySelect, true);
    initCustomSelect(els.categoryFilter, true);
    initCustomSelect(els.dateFilter, false);
    initCustomSelect(els.impactFilter, false);
    initCustomSelect(els.categorySelect, true);

    applyTheme(storage.getItem(THEME_KEY) || "light");
    checkFirstTimeUser();
    const initialTab = window.location.hash === "#events" ? "events" : "overview";
    switchTab(initialTab);
    render();
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      APP_VERSION,
      normalizeEvent,
      IMPACTS,
      renderImpactBadge,
      calculateStreak,
      calculateStreaks,
      calculateAverageImpact,
      get30DayChartBuckets,
      getTimelineGroup,
      mergeEvents,
      reassignCategoryEvents,
      escapeHtml,
      highlightMatches,
      debounce,
      matchesDateFilter,
      matchesImpactFilter,
      getFocusableSelectors,
      getNextFocusableIndex,
      trapFocus,
      releaseFocus
    };
  }
})();