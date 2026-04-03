import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUserIdWithApiKey } from "$lib/server/auth";
import { getDayMinutes, getTimerStatus } from "$lib/server/db";

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const GET: RequestHandler = async (event) => {
  const userId = await requireUserIdWithApiKey(event, "hours:read");
  const day = todayIso();

  const storedMinutes = getDayMinutes(userId, day);
  const timer = getTimerStatus(userId);
  const runningMinutes = timer.isRunning
    ? Math.floor(timer.elapsedSeconds / 60)
    : 0;

  return json({
    data: {
      day,
      totalMinutesStored: storedMinutes,
      runningElapsedSeconds: timer.elapsedSeconds,
      totalMinutesEffective: storedMinutes + runningMinutes,
    },
    error: null,
  });
};
