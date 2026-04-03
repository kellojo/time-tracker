<script lang="ts">
  type SessionItem = {
    id: string;
    start: string;
    end: string;
    note: string;
  };

  type DayData = {
    date: string;
    totalHours: number;
  };

  const monthLabel = "April 2026";

  const days = $state<DayData[]>(
    Array.from({ length: 30 }, (_, i) => ({
      date: `2026-04-${String(i + 1).padStart(2, "0")}`,
      totalHours:
        Math.round((Math.random() * 8 + (i % 3 === 0 ? 1.8 : 0.4)) * 10) / 10,
    })),
  );

  let selectedDate = $state("2026-04-02");

  let sessions = $state<Record<string, SessionItem[]>>({
    "2026-04-02": [
      {
        id: "a1",
        start: "08:45",
        end: "11:50",
        note: "Planning + focused build",
      },
      { id: "a2", start: "13:00", end: "16:30", note: "UI implementation" },
    ],
    "2026-04-03": [
      { id: "b1", start: "09:15", end: "12:00", note: "Bug triage" },
    ],
  });

  const selectedSessions = $derived(sessions[selectedDate] ?? []);

  function saveSession(id: string, key: keyof SessionItem, value: string) {
    sessions = {
      ...sessions,
      [selectedDate]: (sessions[selectedDate] ?? []).map((session) =>
        session.id === id ? { ...session, [key]: value } : session,
      ),
    };
  }

  function addSession() {
    sessions = {
      ...sessions,
      [selectedDate]: [
        ...(sessions[selectedDate] ?? []),
        {
          id: crypto.randomUUID(),
          start: "09:00",
          end: "10:00",
          note: "New entry",
        },
      ],
    };
  }

  function removeSession(id: string) {
    sessions = {
      ...sessions,
      [selectedDate]: (sessions[selectedDate] ?? []).filter(
        (session) => session.id !== id,
      ),
    };
  }

  const intensityClass = (hours: number) => {
    if (hours < 1) return "lvl-0";
    if (hours < 3) return "lvl-1";
    if (hours < 5) return "lvl-2";
    if (hours < 7) return "lvl-3";
    return "lvl-4";
  };
</script>

<section class="panel">
  <div class="section-head">
    <div>
      <p class="eyebrow">Calendar</p>
      <h2>{monthLabel}</h2>
    </div>
    <button class="secondary" onclick={addSession}>+ Add Session</button>
  </div>

  <div class="calendar-grid">
    {#each days as day}
      <button
        class={`day ${intensityClass(day.totalHours)} ${selectedDate === day.date ? "active" : ""}`}
        onclick={() => (selectedDate = day.date)}
      >
        <span>{Number(day.date.slice(-2))}</span>
        <small>{day.totalHours}h</small>
      </button>
    {/each}
  </div>

  <div class="drawer">
    <h3>Sessions for {selectedDate}</h3>
    {#if selectedSessions.length === 0}
      <p class="muted">No entries for this day yet.</p>
    {:else}
      {#each selectedSessions as session}
        <article class="session-item">
          <label>
            Start
            <input
              type="time"
              value={session.start}
              oninput={(e) =>
                saveSession(
                  session.id,
                  "start",
                  (e.currentTarget as HTMLInputElement).value,
                )}
            />
          </label>
          <label>
            End
            <input
              type="time"
              value={session.end}
              oninput={(e) =>
                saveSession(
                  session.id,
                  "end",
                  (e.currentTarget as HTMLInputElement).value,
                )}
            />
          </label>
          <label class="note">
            Note
            <input
              type="text"
              value={session.note}
              oninput={(e) =>
                saveSession(
                  session.id,
                  "note",
                  (e.currentTarget as HTMLInputElement).value,
                )}
            />
          </label>
          <button class="ghost" onclick={() => removeSession(session.id)}
            >Delete</button
          >
        </article>
      {/each}
    {/if}
  </div>
</section>
