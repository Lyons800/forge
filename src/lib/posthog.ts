/**
 * PostHog analytics — ENV-gated.
 * Only initialises in the browser when NEXT_PUBLIC_POSTHOG_KEY is set.
 * All exports are safe no-ops when the key is absent.
 */

let _initialised = false;

function init(): void {
  if (
    _initialised ||
    typeof window === "undefined" ||
    !process.env.NEXT_PUBLIC_POSTHOG_KEY
  ) {
    return;
  }
  // Lazy-import so posthog-js is not included in server bundles when unused.
  import("posthog-js").then(({ default: posthog }) => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
      capture_pageview: false, // We fire pageview manually via PostHogPageView.
      persistence: "localStorage+cookie",
    });
    _initialised = true;
  });
}

// Run init eagerly on import (browser + key present only).
init();

export async function capture(
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return;
  }
  const { default: posthog } = await import("posthog-js");
  posthog.capture(event, properties);
}
