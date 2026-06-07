import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../drizzle/schema";

const url = process.env.DATABASE_URL;
export const db = url
  ? drizzle(new Pool({ connectionString: url }), { schema })
  : (null as unknown as ReturnType<typeof drizzle<typeof schema>>);

/** The drizzle db type used throughout the application. */
export type Db = ReturnType<typeof drizzle<typeof schema>>;
