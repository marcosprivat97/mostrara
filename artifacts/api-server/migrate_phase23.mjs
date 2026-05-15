import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

await db.execute(sql`
  ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_delivery_rating integer,
  ADD COLUMN IF NOT EXISTS customer_delivery_feedback text DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_delivery_feedback_at timestamp;
`);
