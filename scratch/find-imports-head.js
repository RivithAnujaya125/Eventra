import fs from "fs";

const filePath = "c:\\Users\\anuja\\OneDrive\\Documents\\eventra\\src\\pages\\AdminDashboard.tsx";
const content = fs.readFileSync(filePath, "utf-8");
const lines = content.split("\n");

console.log("Searching for storage imports in AdminDashboard.tsx...");
lines.forEach((line, index) => {
  if (index < 40) {
    console.log(`Line ${index + 1}: ${line}`);
  }
});
