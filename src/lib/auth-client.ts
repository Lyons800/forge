"use client";
// APP-plane auth client — thin wrapper around better-auth/react.
// Used by client components to sign up, sign in, sign out, etc.
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
});
