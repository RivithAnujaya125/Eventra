import fs from "fs";

const filePath = "c:\\Users\\anuja\\OneDrive\\Documents\\eventra\\src\\pages\\AdminDashboard.tsx";
const content = fs.readFileSync(filePath, "utf-8");
const lines = content.split("\n");

console.log("Searching for editing event state inside AdminDashboard.tsx...");
lines.forEach((line, index) => {
  if (line.includes("setNewEvent") && (line.includes("title:") || line.includes("date:"))) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
