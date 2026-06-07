import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // better-auth ships @better-auth/kysely-adapter whose sqlite dialect files
  // import internal kysely symbols (DEFAULT_MIGRATION_TABLE etc.) that were
  // moved out of the main kysely index in 0.29.x. We carry a minimal patch
  // (patches/kysely@0.29.2.patch) that re-exports those symbols so Turbopack's
  // externals-tracing can resolve them without breaking the build.
  // serverExternalPackages covers the webpack path as a belt-and-suspenders guard.
  serverExternalPackages: ["@better-auth/kysely-adapter"],
};

// withSentryConfig wraps for source-map upload and tunneling.
// When SENTRY_AUTH_TOKEN is absent, no source maps are uploaded and the
// build succeeds — the plugin skips upload silently.
export default withSentryConfig(nextConfig, {
  // Source maps — only uploaded when SENTRY_AUTH_TOKEN is set in CI.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Suppress non-error output in non-CI environments.
  silent: !process.env.CI,
  // Disable telemetry from Sentry CLI.
  telemetry: false,
});
