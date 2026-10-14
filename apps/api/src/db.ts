import { createDb } from "./schema.ts";

export const db = createDb(process.env.DB_PATH ?? "killer.db");
