<script lang="ts">
  import { page } from "$app/state";
  import { onMount } from "svelte";

  let errorMessage = $state("");

  onMount(async () => {
    const callbackUrl = page.url.searchParams.get("callbackUrl") || "/";

    try {
      const res = await fetch("/api/auth/sign-in/oauth2", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          providerId: "oidc",
          callbackURL: callbackUrl,
        }),
      });

      const payload = await res.json();
      if (!res.ok || !payload?.url) {
        errorMessage =
          payload?.message ||
          payload?.error ||
          "OIDC sign-in initiation failed.";
        return;
      }

      window.location.href = payload.url;
    } catch (e) {
      errorMessage =
        e instanceof Error ? e.message : "Could not start OIDC sign-in.";
    }
  });
</script>

<svelte:head>
  <title>Signing In...</title>
</svelte:head>

<main class="auth-screen">
  <section class="auth-panel" aria-live="polite">
    <p class="eyebrow">Authentication</p>
    <h1>Redirecting to your identity provider</h1>
    <p class="auth-copy">
      We are opening your secure sign-in page. This should only take a moment.
    </p>

    <div class="loader" role="status" aria-label="Loading">
      <span></span>
      <span></span>
      <span></span>
    </div>

    {#if errorMessage}
      <p class="form-error">{errorMessage}</p>
    {/if}
  </section>
</main>

<style>
  .auth-screen {
    min-height: 100svh;
    display: grid;
    place-items: center;
    padding: clamp(1rem, 3vw, 2rem);
  }

  .auth-panel {
    width: min(42rem, 100%);
    border: 1px solid var(--line);
    border-radius: 1.4rem;
    padding: clamp(1.25rem, 3vw, 2rem);
    background: radial-gradient(
        circle at 95% 0%,
        color-mix(in srgb, var(--accent) 18%, transparent),
        transparent 40%
      ),
      linear-gradient(
        165deg,
        color-mix(in srgb, var(--card) 94%, white) 0%,
        color-mix(in srgb, var(--bg-soft) 88%, var(--card)) 100%
      );
    box-shadow: var(--shadow);
    display: grid;
    gap: 0.9rem;
    animation: fade-up 280ms ease-out;
  }

  h1 {
    font-size: clamp(1.4rem, 1.2rem + 1.2vw, 2rem);
    letter-spacing: -0.02em;
    line-height: 1.12;
  }

  .auth-copy {
    color: var(--muted);
    max-width: 48ch;
  }

  .loader {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    margin-top: 0.3rem;
    min-height: 1rem;
  }

  .loader span {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 999px;
    background: var(--accent);
    opacity: 0.25;
    animation: ping 0.95s infinite ease-in-out;
  }

  .loader span:nth-child(2) {
    animation-delay: 120ms;
  }

  .loader span:nth-child(3) {
    animation-delay: 240ms;
  }

  .form-error {
    margin-top: 0.55rem;
  }

  @keyframes ping {
    0%,
    100% {
      transform: scale(1);
      opacity: 0.25;
    }

    50% {
      transform: scale(1.2);
      opacity: 1;
    }
  }

  @keyframes fade-up {
    from {
      opacity: 0;
      transform: translateY(10px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
