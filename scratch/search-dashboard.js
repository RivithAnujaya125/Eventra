import fs from "fs";
import path from "path";

const filePath = "c:\\Users\\anuja\\OneDrive\\Documents\\eventra\\src\\pages\\AdminDashboard.tsx";
const content = fs.readFileSync(filePath, "utf-8");
const lines = content.split("\n");

console.log("Searching for '/api/events' in AdminDashboard.tsx...");
lines.forEach((line, index) => {
  if (line.includes("/api/events")) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
