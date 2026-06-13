import fs from "fs";

const filePath = "c:\\Users\\anuja\\OneDrive\\Documents\\eventra\\src\\pages\\AdminDashboard.tsx";
const content = fs.readFileSync(filePath, "utf-8");
const lines = content.split("\n");

console.log("Searching for fee and capacity input fields in AdminDashboard.tsx...");
lines.forEach((line, index) => {
  if (line.includes("newEvent.fee") || line.includes("newEvent.capacity")) {
    for (let i = Math.max(0, index - 2); i < Math.min(lines.length, index + 8); i++) {
      console.log(`Line ${i + 1}: ${lines[i]}`);
    }
    console.log("---");
  }
});
