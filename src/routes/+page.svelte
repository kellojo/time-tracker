<script lang="ts">
  import { browser } from "$app/environment";
  import { onMount } from "svelte";
  import TimerCard from "$lib/ui/TimerCard.svelte";

  type MonthPreviewDay = {
    day: number;
    minutes: number;
    isToday: boolean;
    isWeekend: boolean;
    weekdayShort: string;
  };

  const now = new Date();
  const weekdayHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  let viewedYear = $state(now.getFullYear());
  let viewedMonth = $state(now.getMonth());

  const currentMonthLabel = $derived(
    new Date(viewedYear, viewedMonth, 1).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    }),
  );
  const firstDayMondayIndex = $derived(
    (new Date(viewedYear, viewedMonth, 1).getDay() + 6) % 7,
  );
  const daysInViewedMonth = $derived(
    new Date(viewedYear, viewedMonth + 1, 0).getDate(),
  );
  const currentMonthKey = $derived(
    `${viewedYear}-${String(viewedMonth + 1).padStart(2, "0")}`,
  );

  const buildMonthPreviewDays = (
    year: number,
    month: number,
    dayCount: number,
  ) =>
    Array.from({ length: dayCount }, (_, i) => {
      const day = i + 1;
      const weekday = new Date(year, month, day).getDay();
      const weekdayShort = weekdayHeaders[(weekday + 6) % 7];
      return {
        day,
        minutes: 0,
        isToday:
          year === now.getFullYear() &&
          month === now.getMonth() &&
          day === now.getDate(),
        isWeekend: weekday === 0 || weekday === 6,
        weekdayShort,
      };
    });

  let monthPreviewDays = $state<MonthPreviewDay[]>(
    buildMonthPreviewDays(viewedYear, viewedMonth, daysInViewedMonth),
  );

  let selectedDay = $state(now.getDate());
  let editValue = $state("");
  let inputError = $state("");
  let isTracking = $state(false);
  let activeRunSeconds = $state(0);
  let timerActionPending = $state(false);
  let apiMessage = $state("");
  let theme = $state<"light" | "dark">(
    browser && document.documentElement.getAttribute("data-theme") === "dark"
      ? "dark"
      : "light",
  );

  const formatMinutes = (minutes: number) => {
    const safeMinutes = Math.max(0, Math.round(minutes));
    const hoursPart = Math.floor(safeMinutes / 60);
    const minutesPart = safeMinutes % 60;
    return `${hoursPart}h ${minutesPart}m`;
  };

  const selectedDayEntry = $derived(
    monthPreviewDays.find((entry) => entry.day === selectedDay),
  );
  const selectedDayMinutes = $derived(selectedDayEntry?.minutes ?? 0);
  const selectedDayDisplayMinutes = $derived(
    selectedDayMinutes + (isTracking ? Math.floor(activeRunSeconds / 60) : 0),
  );
  const selectedDayLabel = $derived(
    new Date(viewedYear, viewedMonth, selectedDay).toLocaleDateString(
      undefined,
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      },
    ),
  );
  const remainingToTargetMinutes = $derived(
    Math.max(0, 8 * 60 - selectedDayDisplayMinutes),
  );

  $effect(() => {
    if (!selectedDayEntry) return;
    editValue =
      selectedDayEntry.minutes > 0
        ? formatMinutes(selectedDayEntry.minutes)
        : "";
  });

  const parseDurationInput = (value: string) => {
    const input = value.trim();

    const hoursAndMinutes = input.match(/^(\d+)\s*h\s*([0-5]?\d)\s*m$/i);
    if (hoursAndMinutes) {
      return Number(hoursAndMinutes[1]) * 60 + Number(hoursAndMinutes[2]);
    }

    const hoursOnly = input.match(/^(\d+)\s*h$/i);
    if (hoursOnly) {
      return Number(hoursOnly[1]) * 60;
    }

    const minutesOnly = input.match(/^([0-5]?\d)\s*m$/i);
    if (minutesOnly) {
      return Number(minutesOnly[1]);
    }

    return null;
  };

  const setSelectedDay = (dayNumber: number) => {
    selectedDay = dayNumber;
    inputError = "";
    apiMessage = "";
  };

  const goToPreviousMonth = () => {
    if (viewedMonth === 0) {
      viewedMonth = 11;
      viewedYear -= 1;
      return;
    }
    viewedMonth -= 1;
  };

  const goToNextMonth = () => {
    if (viewedMonth === 11) {
      viewedMonth = 0;
      viewedYear += 1;
      return;
    }
    viewedMonth += 1;
  };

  const goToCurrentMonth = () => {
    viewedYear = now.getFullYear();
    viewedMonth = now.getMonth();
    selectedDay = Math.min(now.getDate(), daysInViewedMonth);
  };

  const selectedDateIso = (dayNumber: number) =>
    `${currentMonthKey}-${String(dayNumber).padStart(2, "0")}`;

  async function loadMonthData() {
    const res = await fetch(`/api/days?month=${currentMonthKey}`);
    const payload = await res.json();
    if (!res.ok || !payload?.data?.days) {
      apiMessage = payload?.error?.message ?? "Could not load month data.";
      return;
    }

    const dayMap = payload.data.days as Record<string, number>;
    monthPreviewDays = monthPreviewDays.map((entry) => {
      const key = selectedDateIso(entry.day);
      return {
        ...entry,
        minutes: Number(dayMap[key] ?? 0),
      };
    });
  }

  async function loadTimerStatus() {
    const res = await fetch("/api/timer/status");
    const payload = await res.json();
    if (!res.ok || !payload?.data) {
      apiMessage = payload?.error?.message ?? "Could not load timer status.";
      return;
    }

    isTracking = Boolean(payload.data.isRunning);
    activeRunSeconds = Number(payload.data.elapsedSeconds ?? 0);
  }

  const applyTheme = (value: "light" | "dark") => {
    theme = value;
    if (!browser) return;
    document.documentElement.setAttribute("data-theme", value);
    localStorage.setItem("theme", value);
  };

  const toggleTheme = () => {
    applyTheme(theme === "light" ? "dark" : "light");
  };

  const applyHoursToSelectedDay = () => {
    void applyHoursToSelectedDayAsync();
  };

  const applyHoursToSelectedDayAsync = async () => {
    const parsed = parseDurationInput(editValue);
    if (parsed === null) {
      inputError = "Use 5h 30m, 5h, or 50m.";
      return;
    }

    const day = selectedDateIso(selectedDay);
    const res = await fetch(`/api/days/${day}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ minutes: parsed }),
    });
    const payload = await res.json();

    if (!res.ok) {
      inputError = payload?.error?.message ?? "Could not save daily total.";
      return;
    }

    monthPreviewDays = monthPreviewDays.map((entry) =>
      entry.day === selectedDay
        ? { ...entry, minutes: Number(payload.data.totalMinutes) }
        : entry,
    );

    inputError = "";
    apiMessage = "";
  };

  $effect(() => {
    if (!isTracking) return;

    const id = setInterval(() => {
      activeRunSeconds += 1;
    }, 1000);

    return () => clearInterval(id);
  });

  const toggleTracking = () => {
    void toggleTrackingAsync();
  };

  const toggleTrackingAsync = async () => {
    if (timerActionPending) return;
    timerActionPending = true;

    if (!isTracking) {
      const startRes = await fetch("/api/timer/start", { method: "POST" });
      const startPayload = await startRes.json();
      if (!startRes.ok) {
        apiMessage = startPayload?.error?.message ?? "Could not start timer.";
        timerActionPending = false;
        return;
      }

      isTracking = true;
      activeRunSeconds = 0;
      apiMessage = "";
      timerActionPending = false;
      return;
    }

    const stopRes = await fetch("/api/timer/stop", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ day: selectedDateIso(selectedDay) }),
    });
    const stopPayload = await stopRes.json();

    if (!stopRes.ok) {
      apiMessage = stopPayload?.error?.message ?? "Could not stop timer.";
      timerActionPending = false;
      return;
    }

    monthPreviewDays = monthPreviewDays.map((entry) =>
      entry.day === selectedDay
        ? { ...entry, minutes: Number(stopPayload.data.totalMinutes) }
        : entry,
    );

    activeRunSeconds = 0;
    isTracking = false;
    apiMessage = "";
    timerActionPending = false;
  };

  const intensityClass = (hours: number) => {
    if (hours < 1) return "lvl-0";
    if (hours < 3) return "lvl-1";
    if (hours < 5) return "lvl-2";
    if (hours < 7) return "lvl-3";
    return "lvl-4";
  };

  $effect(() => {
    monthPreviewDays = buildMonthPreviewDays(
      viewedYear,
      viewedMonth,
      daysInViewedMonth,
    );

    selectedDay = Math.min(Math.max(1, selectedDay), daysInViewedMonth);
    inputError = "";
    apiMessage = "";

    if (browser) {
      void loadMonthData();
    }
  });

  onMount(() => {
    void loadMonthData();
    void loadTimerStatus();

    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const initialTheme =
      stored === "light" || stored === "dark"
        ? stored
        : prefersDark
          ? "dark"
          : "light";
    applyTheme(initialTheme);
  });
</script>

<svelte:head>
  <title>Time Tracker Preview</title>
  <meta
    name="description"
    content="SvelteKit preview for simple day-based time tracking with start/stop and editable hours/minutes."
  />
</svelte:head>

<main class="shell">
  <header class="topbar">
    <div>
      <p class="eyebrow">Time Tracker</p>
      <h1>Simple, focused work hour tracking</h1>
    </div>
    <div class="topbar-actions">
      <a
        class="mini-link"
        href="https://github.com/Kellojo/time-tracker"
        target="_blank"
        rel="noreferrer"
      >
        Open on GitHub
      </a>
      <a class="nav-link" href="/keys">API Keys</a>

      <button
        class="theme-toggle"
        onclick={toggleTheme}
        aria-label="Toggle light and dark theme"
      >
        Theme: {theme === "dark" ? "Dark" : "Light"}
      </button>
    </div>
  </header>

  <section class="dashboard-stack">
    <div class="grid">
      <TimerCard
        isRunning={isTracking}
        elapsedSeconds={activeRunSeconds}
        trackedDayLabel={selectedDayLabel}
        ontoggle={toggleTracking}
        pending={timerActionPending}
      />
      <article class="panel summary">
        <p class="eyebrow">Selected Day</p>
        <h2>{formatMinutes(selectedDayDisplayMinutes)}</h2>
        <p class="muted">Total tracked for {selectedDayLabel}</p>
        <div class="summary-list">
          <div>
            <span>Tracked so far</span>
            <strong>{formatMinutes(selectedDayDisplayMinutes)}</strong>
          </div>
          <div>
            <span>Remaining to 8h</span>
            <strong>{formatMinutes(remainingToTargetMinutes)}</strong>
          </div>
          <div>
            <span>Tracking state</span>
            <strong>{isTracking ? "Running" : "Stopped"}</strong>
          </div>
        </div>
      </article>
    </div>

    <article class="panel month-preview">
      <div class="section-head">
        <div>
          <p class="eyebrow">Current Month Preview</p>
          <h2>{currentMonthLabel}</h2>
        </div>
        <div class="month-nav">
          <button
            class="secondary"
            onclick={goToPreviousMonth}
            aria-label="Previous month"
          >
            Prev
          </button>
          <button
            class="secondary"
            onclick={goToCurrentMonth}
            aria-label="Current month"
          >
            Today
          </button>
          <button
            class="secondary"
            onclick={goToNextMonth}
            aria-label="Next month"
          >
            Next
          </button>
        </div>
      </div>
      <div class="month-weekdays" aria-hidden="true">
        {#each weekdayHeaders as dayName}
          <span>{dayName}</span>
        {/each}
      </div>
      <div class="month-grid">
        {#each Array.from({ length: firstDayMondayIndex }) as _, i}
          <div class="month-empty" aria-hidden="true"></div>
        {/each}
        {#each monthPreviewDays as day}
          <button
            class={`month-cell ${intensityClass(day.minutes / 60)} ${day.isWeekend ? "weekend" : ""} ${day.isToday ? "active" : ""} ${selectedDay === day.day ? "selected" : ""}`}
            onclick={() => setSelectedDay(day.day)}
            aria-label={`Set tracked hours for ${day.weekdayShort} day ${day.day}`}
          >
            <strong
              >{day.day}
              <span class="day-week">{day.weekdayShort}</span></strong
            >
            {#if day.minutes > 0}
              <small>{formatMinutes(day.minutes)}</small>
            {/if}
          </button>
        {/each}
      </div>

      <div class="month-editor">
        <p class="muted">Selected day: {selectedDay}</p>
        <div class="month-editor-row">
          <input
            type="text"
            bind:value={editValue}
            placeholder="5h 30m"
            aria-label="Hours worked format"
          />
          <button class="primary" onclick={applyHoursToSelectedDay}
            >Set Hours</button
          >
        </div>
        {#if inputError}
          <p class="form-error">{inputError}</p>
        {/if}
        {#if apiMessage}
          <p class="muted">{apiMessage}</p>
        {/if}
      </div>
    </article>
  </section>
</main>
