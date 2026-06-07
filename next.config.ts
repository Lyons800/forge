import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-auth ships @better-auth/kysely-adapter which uses kysely internals
  // that are not re-exported in the installed kysely@0.29.x (they were present
  // in earlier minor versions). Marking it as a server external stops turbopack
  // from statically analysing the MJS named imports at build time, letting Node
  // resolve them at runtime where the CommonJS fallback works correctly.
  serverExternalPackages: ["@better-auth/kysely-adapter"],
};

export default nextConfig;
