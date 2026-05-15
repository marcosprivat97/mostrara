import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

await db.execute(sql`
  ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_confirmation_code text DEFAULT '';
`);
