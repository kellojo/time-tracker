<script lang="ts">
  type HeatCell = {
    day: string;
    hours: number;
  };

  const cells = $state<HeatCell[]>(
    Array.from({ length: 7 * 20 }, (_, i) => ({
      day: new Date(Date.now() - (7 * 20 - i) * 86400000)
        .toISOString()
        .slice(0, 10),
      hours: Math.round(Math.random() * 90) / 10,
    })),
  );

  const timeline = $state([
    { day: "2026-04-02", summary: "2 sessions", total: "6h 35m" },
    { day: "2026-04-01", summary: "3 sessions", total: "7h 10m" },
    { day: "2026-03-31", summary: "1 session", total: "2h 40m" },
    { day: "2026-03-30", summary: "4 sessions", total: "8h 05m" },
  ]);

  let selectedDay = $state("");

  const level = (h: number) => {
    if (h < 0.5) return "lvl-0";
    if (h < 2) return "lvl-1";
    if (h < 4) return "lvl-2";
    if (h < 6) return "lvl-3";
    return "lvl-4";
  };
</script>

<section class="panel">
  <div class="section-head">
    <div>
      <p class="eyebrow">History</p>
      <h2>Commit-style Activity</h2>
    </div>
    <p class="muted">Last 20 weeks</p>
  </div>

  <div class="heatmap-wrap">
    <div class="heatmap-grid">
      {#each cells as cell}
        <button
          class={`heat ${level(cell.hours)} ${selectedDay === cell.day ? "active" : ""}`}
          title={`${cell.day}: ${cell.hours}h tracked`}
          onclick={() => (selectedDay = cell.day)}
        ></button>
      {/each}
    </div>
    <p class="muted">
      {selectedDay
        ? `Selected: ${selectedDay}`
        : "Click a square to filter activity."}
    </p>
  </div>

  <div class="timeline">
    {#each timeline as item}
      {#if !selectedDay || selectedDay === item.day}
        <article class="event">
          <strong>{item.day}</strong>
          <span>{item.summary}</span>
          <em>{item.total}</em>
        </article>
      {/if}
    {/each}
  </div>
</section>
