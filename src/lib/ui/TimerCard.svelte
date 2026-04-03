<script lang="ts">
  type Props = {
    isRunning: boolean;
    elapsedSeconds: number;
    trackedDayLabel: string;
    ontoggle: () => void;
    pending: boolean;
  };

  const {
    isRunning,
    elapsedSeconds,
    trackedDayLabel,
    ontoggle,
    pending,
  }: Props = $props();

  const fmt = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };
</script>

<section class="panel timer-panel">
  <div class="timer-head">
    <p class="eyebrow">Live Tracker</p>
    <div class="status" class:live={isRunning}>
      <span class="dot"></span>
      {isRunning ? "Running" : "Stopped"}
    </div>
  </div>

  <h2 class="timer-value">{fmt(elapsedSeconds)}</h2>

  <p class="timer-subtext">
    {isRunning
      ? `Tracking worked time for ${trackedDayLabel}.`
      : `Press start to begin tracking for ${trackedDayLabel}.`}
  </p>

  <button class="primary" onclick={ontoggle} disabled={pending}>
    {pending ? "Working..." : isRunning ? "Stop Tracking" : "Start Tracking"}
  </button>
</section>
