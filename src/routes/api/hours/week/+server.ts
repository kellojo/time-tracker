import { json, type RequestHandler } from "@sveltejs/kit";
import { requireUserIdWithApiKey } from "$lib/server/auth";
import { getDayTotalsBetween, getTimerStatus } from "$lib/server/db";

function toIsoLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getCurrentWeekDays() {
  const today = new Date();
  const start = new Date(today);
  const daysFromMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysFromMonday);

  const days: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(toIsoLocalDate(day));
  }

  return {
    today: toIsoLocalDate(today),
    weekStart: days[0],
    weekEnd: days[6],
    days,
  };
}

export const GET: RequestHandler = async (event) => {
  const userId = await requireUserIdWithApiKey(event, "hours:read");
  const { today, weekStart, weekEnd, days } = getCurrentWeekDays();

  const storedByDay = getDayTotalsBetween(userId, weekStart, weekEnd);
  const timer = getTimerStatus(userId);
  const runningMinutes = timer.isRunning
    ? Math.floor(timer.elapsedSeconds / 60)
    : 0;

  const weekDays = days.map((day) => {
    const totalMinutesStored = storedByDay[day] ?? 0;
    const isToday = day === today;

    return {
      day,
      totalMinutesStored,
      runningElapsedSeconds: isToday ? timer.elapsedSeconds : 0,
      totalMinutesEffective: totalMinutesStored + (isToday ? runningMinutes : 0),
    };
  });

  const weekTotalMinutesStored = weekDays.reduce(
    (sum, day) => sum + day.totalMinutesStored,
    0,
  );
  const weekTotalMinutesEffective = weekDays.reduce(
    (sum, day) => sum + day.totalMinutesEffective,
    0,
  );

  return json({
    data: {
      weekStart,
      weekEnd,
      days: weekDays,
      weekTotalMinutesStored,
      weekTotalMinutesEffective,
    },
    error: null,
  });
};
