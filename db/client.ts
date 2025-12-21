import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import * as schema from "./schema";

// This creates the physical database file on the phone
export const expoDb = openDatabaseSync("goal_counter.db");

// This wraps it in Drizzle for type-safe queries
export const db = drizzle(expoDb, { schema });
