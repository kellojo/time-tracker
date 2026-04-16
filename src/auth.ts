import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import { DatabaseSync } from "node:sqlite";
import { env } from "$env/dynamic/private";

const authSecret =
  env.BETTER_AUTH_SECRET ||
  env.AUTH_SECRET ||
  "local-build-secret-change-me-32-plus-chars";

const authDb = new DatabaseSync(env.AUTH_DATABASE_PATH || "auth.db");

function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

const rawDevAuthBypass = isTruthy(env.DEV_AUTH_BYPASS);
const isProduction = env.NODE_ENV === "production";

if (rawDevAuthBypass && isProduction) {
  console.warn("DEV_AUTH_BYPASS is ignored when NODE_ENV=production.");
}

export const devAuthBypassEnabled = rawDevAuthBypass && !isProduction;

function requireEnv(name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

let oidcConfig:
  | {
      issuer: string;
      clientId: string;
      clientSecret: string;
      discoveryUrl: string;
    }
  | undefined;

if (!devAuthBypassEnabled) {
  const oidcIssuer = requireEnv("OIDC_ISSUER").replace(/\/+$/, "");
  const oidcClientId = requireEnv("OIDC_CLIENT_ID");
  const oidcClientSecret = requireEnv("OIDC_CLIENT_SECRET");
  const oidcDiscoveryUrl = new URL(
    "/.well-known/openid-configuration",
    `${oidcIssuer}/`,
  ).toString();

  oidcConfig = {
    issuer: oidcIssuer,
    clientId: oidcClientId,
    clientSecret: oidcClientSecret,
    discoveryUrl: oidcDiscoveryUrl,
  };
}

export const auth = betterAuth({
  secret: authSecret,
  baseURL: env.BETTER_AUTH_URL || "http://localhost:5173",
  database: authDb,
  basePath: "/api/auth",
  trustedOrigins: [env.BETTER_AUTH_URL || "http://localhost:5173"],
  plugins: oidcConfig
    ? [
        genericOAuth({
          config: [
            {
              providerId: "oidc",
              discoveryUrl: oidcConfig.discoveryUrl,
              issuer: oidcConfig.issuer,
              clientId: oidcConfig.clientId,
              clientSecret: oidcConfig.clientSecret,
              scopes: ["openid", "profile", "email"],
              pkce: true,
            },
          ],
        }),
      ]
    : [],
});

export const authReady = auth.$context
  .then(async (ctx) => {
    await ctx.runMigrations();
  })
  .catch((err) => {
    console.error("Better Auth migration failed", err);
    throw err;
  });
