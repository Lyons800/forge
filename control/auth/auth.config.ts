// CONTROL PLANE — DO NOT EDIT
// This file is the authoritative Better Auth configuration.
// It lives in the control/ directory, which is intentionally separated from
// the app plane and must never be modified by the autonomous engine.
// Only the human owner may change this file.
//
// See control/README.md for the full control plane contract.

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000",
});
