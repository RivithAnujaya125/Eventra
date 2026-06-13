import { db } from "./firebase";

export async function seedDatabase() {
  try {
    if (!db) return;
    const eventsRef = db.collection("events");
    const snapshot = await eventsRef.limit(1).get();
    
    if (snapshot.empty) {
      console.log("🌱 Seeding initial events...");
      const currentYear = new Date().getFullYear();
      
      const initialEvents = [
        {
          title: `Tech Summit ${currentYear}`,
          description: "A deep dive into AI and Cloud computing.",
          date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days in the future
          location: "Main Auditorium",
          category: "Tech",
          fee: 50,
          capacity: 200,
          registeredCount: 0,
          createdAt: new Date()
        },
        {
          title: "Design Workshop",
          description: "Hands-on UI/UX design session.",
          date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days in the future
          location: "Studio A",
          category: "Design",
          fee: 30,
          capacity: 40,
          registeredCount: 0,
          createdAt: new Date()
        }
      ];

      for (const event of initialEvents) {
        await eventsRef.add(event);
      }
      console.log("✅ Seeding complete.");
    }
  } catch (err) {
    console.error("❌ Seeding failed:", err);
  }
}
