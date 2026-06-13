import fs from "fs";

const filePath = "c:\\Users\\anuja\\OneDrive\\Documents\\eventra\\src\\pages\\AdminDashboard.tsx";
const content = fs.readFileSync(filePath, "utf-8");
const lines = content.split("\n");

console.log("Searching for form handling fields in AdminDashboard.tsx...");
let start = false;
let printed = 0;
lines.forEach((line, index) => {
  if (line.includes("handleCreateEvent") && line.includes("onSubmit")) {
    start = true;
  }
  if (start && printed < 60) {
    console.log(`Line ${index + 1}: ${line}`);
    printed++;
  }
});
