import mongoose from "mongoose";

import { env } from "./env.js";

/**
 * Drop any compound index on the reviews collection.
 * Old versions had a unique index that blocked multiple reviews per manager.
 * We drop ALL non-_id compound indexes to ensure a clean slate.
 */
async function fixReviewIndexes() {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection("reviews");
    const indexes = await collection.indexes();
    console.log("[DB] Current review indexes:", indexes.map(i => ({ name: i.name, unique: i.unique, key: i.key })));

    for (const idx of indexes) {
      // Skip the default _id index and single-field indexes we want to keep
      if (idx.name === "_id_") continue;
      if (idx.name === "id_1") continue; // keep the id unique index
      if (idx.name === "internUserId_1") continue;
      if (idx.name === "managerUserId_1") continue;

      // Drop everything else (compound indexes, old unique indexes)
      console.log(`[DB] Dropping review index: ${idx.name}`);
      await collection.dropIndex(idx.name);
    }
    console.log("[DB] Review indexes cleaned up.");
  } catch (err) {
    console.warn("[DB] Could not fix review indexes:", err.message);
  }
}

export async function connectDatabase() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongoUri);
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
  await fixReviewIndexes();
}