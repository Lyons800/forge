import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../../drizzle/schema";

const url = process.env.DATABASE_URL;
export const db = url
  ? drizzle(neon(url), { schema })
  : (null as unknown as ReturnType<typeof drizzle>);
