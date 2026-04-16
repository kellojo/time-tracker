import { env } from "$env/dynamic/private";
import { auth, authReady, devAuthBypassEnabled } from "./auth";

const guardHandle: import("@sveltejs/kit").Handle = async ({
  event,
  resolve,
}) => {
  if (devAuthBypassEnabled) {
    event.locals.session = {
      user: {
        id: env.DEV_AUTH_USER_ID?.trim() || "dev-user",
        email: env.DEV_AUTH_USER_EMAIL?.trim() || "dev@example.local",
        name: env.DEV_AUTH_USER_NAME?.trim() || "Local Developer",
        image: env.DEV_AUTH_USER_IMAGE?.trim() || null,
      },
    };

    return resolve(event);
  }

  const path = event.url.pathname;

  if (path.startsWith("/auth") || path.startsWith("/api/auth")) {
    return resolve(event);
  }

  await authReady;

  const session = await auth.api.getSession({
    headers: event.request.headers,
  });

  event.locals.session = session;

  if (session?.user?.id) {
    return resolve(event);
  }

  if (path.startsWith("/api")) {
    const authHeader = event.request.headers.get("authorization") || "";
    if (authHeader.toLowerCase().startsWith("bearer ")) {
      return resolve(event);
    }

    return new Response(
      JSON.stringify({
        data: null,
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      }),
      {
        status: 401,
        headers: { "content-type": "application/json" },
      },
    );
  }

  const callbackUrl = encodeURIComponent(event.url.pathname + event.url.search);
  return new Response(null, {
    status: 303,
    headers: {
      location: `/auth/login?callbackUrl=${callbackUrl}`,
    },
  });
};

export const handle = guardHandle;
