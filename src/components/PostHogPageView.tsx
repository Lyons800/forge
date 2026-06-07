"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { capture, stripSensitiveParams } from "@/lib/posthog";

/**
 * Fires a `$pageview` capture on every client-side route change.
 * No-ops when NEXT_PUBLIC_POSTHOG_KEY is absent.
 * Must be rendered inside a <Suspense> boundary (useSearchParams requirement).
 */
export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const sanitised = stripSensitiveParams(searchParams.toString());
    const url = pathname + (sanitised ? `?${sanitised}` : "");
    capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}
