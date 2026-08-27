import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import https from "https";
import * as schema from "./schema";

function ipv4Fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return new Promise((resolve, reject) => {
    const url = new URL(typeof input === "string" ? input : input.toString());
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((v, k) => {
      headers[k] = v;
    });
    const body = init?.body ? Buffer.from(String(init.body)) : undefined;
    if (body && !headers["content-length"]) {
      headers["content-length"] = String(body.length);
    }
    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: init?.method || "GET",
        headers,
        family: 4,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          resolve(
            new Response(Buffer.concat(chunks), {
              status: res.statusCode || 500,
              headers: res.headers as HeadersInit,
            })
          );
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

neonConfig.fetchEndpoint = () => {
  const raw = process.env.DATABASE_URL;
  if (!raw) return "https://example.invalid/sql";
  const u = new URL(raw.replace(/^postgresql:/, "https:"));
  return `https://${u.hostname}/sql`;
};

if (typeof window === "undefined") {
  neonConfig.fetchFunction = ipv4Fetch as typeof fetch;
}

type Db = NeonHttpDatabase<typeof schema>;

let _db: Db | null = null;

function getDb(): Db {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (local) or Vercel project env (production)."
    );
  }
  _db = drizzle(neon(url), { schema });
  return _db;
}

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const real = getDb() as unknown as Record<PropertyKey, unknown>;
    const value = Reflect.get(real, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
