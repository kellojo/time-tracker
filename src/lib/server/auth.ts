import { error, type RequestEvent } from "@sveltejs/kit";
import { createHmac } from "node:crypto";
import { env } from "$env/dynamic/private";
import {
  getApiKeyByHash,
  touchApiKeyLastUsed,
  upsertUser,
} from "$lib/server/db";

const API_KEY_SECRET =
  env.API_KEY_SECRET ||
  env.BETTER_AUTH_SECRET ||
  env.AUTH_SECRET ||
  "dev-secret";

export function hashApiKey(rawKey: string) {
  return createHmac("sha256", API_KEY_SECRET).update(rawKey).digest("hex");
}

export function parseBearerToken(event: RequestEvent) {
  const header = event.request.headers.get("authorization") || "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }
  return token.trim();
}

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

export async function requireUserIdWithApiKey(
  event: RequestEvent,
  requiredScope: string,
) {
  const token = parseBearerToken(event);

  if (token) {
    const key = getApiKeyByHash(hashApiKey(token));

    if (!key || key.revokedAt) {
      throw error(401, "Unauthorized");
    }

    if (!key.scopes.includes(requiredScope)) {
      throw error(403, "Forbidden");
    }

    touchApiKeyLastUsed(key.id);
    return key.userId;
  }

  return requireUserId(event);
}
