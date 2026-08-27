import "dotenv/config";
import { readFileSync } from "fs";
import { resolve } from "path";
import { neon } from "@neondatabase/serverless";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const sql = neon(process.env.DATABASE_URL);
  const migration = readFileSync(
    resolve(__dirname, "../drizzle/0000_init.sql"),
    "utf8"
  );

  // Strip line comments and split on semicolons
  const cleaned = migration
    .split("\n")
    .map((line) => (line.trim().startsWith("--") ? "" : line))
    .join("\n");

  const statements = cleaned
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    console.log("→", stmt.slice(0, 60).replace(/\s+/g, " ") + "…");
    await sql.query(stmt);
  }
  console.log(`Applied ${statements.length} statements.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
