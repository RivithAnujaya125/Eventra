import { db, auth } from './server/firebase.js';

async function test() {
  console.log("Testing Firebase Server initialization...");
  console.log("db initialized:", !!db);
  console.log("auth initialized:", !!auth);
  if (db) {
    try {
      const snapshot = await db.collection("events").limit(1).get();
      console.log("Database connection test: SUCCESS!");
      console.log("Documents in 'events' count:", snapshot.size);
    } catch (err) {
      console.error("Database connection test: FAILED!", err);
    }
  } else {
    console.error("db is NULL!");
  }
}

test();
