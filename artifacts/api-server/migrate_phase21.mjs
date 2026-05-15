import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

await db.execute(sql`
  ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS courier_delivery_photo_url text DEFAULT '';
`);
