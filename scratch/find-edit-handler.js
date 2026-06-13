import fs from "fs";

const filePath = "c:\\Users\\anuja\\OneDrive\\Documents\\eventra\\src\\pages\\AdminDashboard.tsx";
const content = fs.readFileSync(filePath, "utf-8");
const lines = content.split("\n");

console.log("Searching for edit function blocks in AdminDashboard.tsx...");
let count = 0;
lines.forEach((line, index) => {
  if (line.includes("handleEdit") || (line.includes("setEditId") && line.includes("event"))) {
    for (let i = Math.max(0, index - 5); i < Math.min(lines.length, index + 25); i++) {
      console.log(`Line ${i + 1}: ${lines[i]}`);
    }
    console.log("---");
  }
});
