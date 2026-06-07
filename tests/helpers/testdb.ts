import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../../drizzle/schema";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export async function makeTestDb() {
  const client = new PGlite();
  const dir = join(process.cwd(), "drizzle", "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const f of files) {
    const sql = readFileSync(join(dir, f), "utf8").replace(
      /--> statement-breakpoint/g,
      ""
    );
    await client.exec(sql);
  }
  return drizzle(client, { schema });
}
