import { auth, authReady } from "./auth";

const guardHandle: import("@sveltejs/kit").Handle = async ({
  event,
  resolve,
}) => {
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
