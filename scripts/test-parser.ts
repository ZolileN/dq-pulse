import "dotenv/config";
import { readFileSync } from "fs";
import { resolve } from "path";
import { parseDqaWorkbook } from "../src/lib/excel/parser";

async function main() {
  const path = resolve(
    process.argv[2] || "./reference/ACC1_DS-TB_DQA_tool_v3.xlsx"
  );
  const buffer = readFileSync(path);
  const parsed = await parseDqaWorkbook(buffer);
  console.log("Metadata:", parsed.metadata);
  console.log("Entries:", parsed.entries.length);
  console.log("Mismatches:", parsed.mismatches.length);
  console.log("Warnings:", parsed.warnings);
  console.log("Sample:", parsed.entries.slice(0, 8));
  if (parsed.mismatches.length) {
    console.log("First mismatches:", parsed.mismatches.slice(0, 5));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
