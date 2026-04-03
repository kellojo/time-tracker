import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUserId } from "$lib/server/auth";
import { setDayMinutes } from "$lib/server/db";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export const PUT: RequestHandler = async (event) => {
  const userId = await requireUserId(event);
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

  const body = await event.request.json().catch(() => ({}));
  const minutes = Number(body?.minutes);

  if (!Number.isFinite(minutes) || minutes < 0) {
    return json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "minutes must be a non-negative number.",
        },
      },
      { status: 400 },
    );
  }

  const totalMinutes = setDayMinutes(userId, day, minutes);

  return json({
    data: { day, totalMinutes },
    error: null,
  });
};
