import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUserIdWithApiKey } from "$lib/server/auth";
import { stopTimer } from "$lib/server/db";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const POST: RequestHandler = async (event) => {
  const userId = await requireUserIdWithApiKey(event, "timer:stop");
  const body = await event.request.json().catch(() => ({}));

  const day =
    typeof body?.day === "string" && DAY_RE.test(body.day)
      ? body.day
      : todayIso();

  const result = stopTimer(userId, day);
  if (!result.stopped) {
    return json(
      {
        data: null,
        error: {
          code: result.reason,
          message: "Timer is not currently running.",
        },
      },
      { status: 400 },
    );
  }

  return json({
    data: result,
    error: null,
  });
};
