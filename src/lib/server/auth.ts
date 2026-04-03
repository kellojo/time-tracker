import { error, type RequestEvent } from "@sveltejs/kit";
import { upsertUser } from "$lib/server/db";

export async function requireUserId(event: RequestEvent) {
  const session = event.locals.session ?? null;
  const userId = session?.user?.id;

  if (!userId) {
    throw error(401, "Unauthorized");
  }

  upsertUser({
    id: userId,
    email: session?.user?.email,
    name: session?.user?.name,
    image: session?.user?.image,
  });

  return userId;
}
