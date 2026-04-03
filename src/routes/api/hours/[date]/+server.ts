import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUserIdWithApiKey } from "$lib/server/auth";
import { getDayMinutes, getTimerStatus } from "$lib/server/db";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const GET: RequestHandler = async (event) => {
  const userId = await requireUserIdWithApiKey(event, "hours:read");
  const day = event.params.date;

  if (!DAY_RE.test(day)) {
    return json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Date must be in YYYY-MM-DD format.",
        },
      },
      { status: 400 },
    );
  }

  const storedMinutes = getDayMinutes(userId, day);
  const isToday = day === todayIso();
  const timer = isToday
    ? getTimerStatus(userId)
    : { isRunning: false, elapsedSeconds: 0 };
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
