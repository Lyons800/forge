"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { capture } from "@/lib/posthog";

/**
 * Fires a `$pageview` capture on every client-side route change.
 * No-ops when NEXT_PUBLIC_POSTHOG_KEY is absent.
 * Must be rendered inside a <Suspense> boundary (useSearchParams requirement).
 */
export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url =
      pathname +
      (searchParams.toString() ? `?${searchParams.toString()}` : "");
    capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}
