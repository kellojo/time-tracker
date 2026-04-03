import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUserId } from "$lib/server/auth";
import { getTimerStatus } from "$lib/server/db";

export const GET: RequestHandler = async (event) => {
  const userId = await requireUserId(event);
  const status = getTimerStatus(userId);

  return json({
    data: status,
    error: null,
  });
};
