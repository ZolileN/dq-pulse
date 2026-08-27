import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
import { saveEntries, upsertFacility } from "../src/lib/entries";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");

  const hash = await bcrypt.hash("dqa-demo-2024", 10);
  const existingUsers = await db.select().from(users);
  if (existingUsers.length === 0) {
    await db.insert(users).values([
      {
        name: "Demo DQM",
        email: "dqm@aurum.org.za",
        role: "dqm",
        passwordHash: hash,
      },
      {
        name: "Demo MERL Officer",
        email: "merl@aurum.org.za",
        role: "merl_officer",
        passwordHash: hash,
      },
    ]);
    console.log("Users seeded.");
  }

  const allUsers = await db.select().from(users);
  const dqm = allUsers.find((u) => u.role === "dqm")!;

  const facilityDefs = [
    { name: "Empilisweni CHC", district: "Sedibeng", subDistrict: "Emfuleni" },
    { name: "Soweto Clinic", district: "Johannesburg", subDistrict: "Soweto" },
    { name: "Leratong Hospital", district: "West Rand", subDistrict: "Mogale City" },
    { name: "Alexandra CHC", district: "Johannesburg", subDistrict: "Alexandra" },
    { name: "Tsakane Clinic", district: "Ekurhuleni", subDistrict: "Tsakane" },
  ];

  const facilityIds: number[] = [];
  for (const f of facilityDefs) {
    facilityIds.push(await upsertFacility(f));
  }

  const periods = ["2024-04-01", "2024-05-01", "2024-06-01"];
  const indicators = [
    "Headcount",
    "TB screening",
    "Client eligible for TB  test",
    "TB test using GeneXpert",
    "DS-TB Bacteriologically confirmed",
    "DSTB treatment start",
  ];

  for (const periodDate of periods) {
    for (let fi = 0; fi < facilityIds.length; fi++) {
      const facilityId = facilityIds[fi];
      const rows: {
        dataType: string;
        ageGroup: string;
        indicator: string;
        source: string;
        stage: "before" | "after";
        value: number;
      }[] = [];

      for (const stage of ["before", "after"] as const) {
        for (const ageGroup of ["Under 5yrs", "Over 5yrs"]) {
          for (const indicator of indicators) {
            const base =
              (fi + 1) * 40 +
              periods.indexOf(periodDate) * 15 +
              (ageGroup === "Over 5yrs" ? 200 : 30) +
              (stage === "after" ? 5 : 0);
            const sources: ("register" | "summary_sheet" | "tier_net" | "dhis")[] =
              indicator === "Headcount" || indicator === "TB screening"
                ? ["register", "summary_sheet", "tier_net", "dhis"]
                : ["register", "summary_sheet", "tier_net"];

            for (const source of sources) {
              let value = base + sources.indexOf(source) * 2;
              if (
                facilityId === facilityIds[0] &&
                periodDate === "2024-06-01" &&
                stage === "before" &&
                indicator === "TB screening" &&
                source === "dhis" &&
                ageGroup === "Over 5yrs"
              ) {
                value = value + 17;
              }
              rows.push({
                dataType: "TB cascade",
                ageGroup,
                indicator,
                source,
                stage,
                value,
              });
            }
          }
        }
      }

      for (const stage of ["before", "after"] as const) {
        for (const [indicator, value] of [
          ["DSTB Treatment success", 65 + fi],
          ["DSTB LTFU", 18 + fi],
          ["DSTB Treatment Failure", 3],
          ["DSTB Died", 4],
          ["Not evaluated", 2],
          ["DSTB Total", 92 + fi],
        ] as const) {
          for (const source of ["register", "tier_net"] as const) {
            rows.push({
              dataType: "DSTB outcome",
              ageGroup: "All ages",
              indicator,
              source,
              stage,
              value: Number(value),
            });
          }
        }
      }

      const mismatches =
        facilityId === facilityIds[0] && periodDate === "2024-06-01"
          ? [
              {
                indicator: "TB screening",
                ageGroup: "Over 5yrs",
                stage: "before" as const,
                sources: { register: 245, dhis: 262 },
                message:
                  "Mismatch on TB screening (Over 5yrs, before): register=245 vs dhis=262",
              },
            ]
          : [];

      await saveEntries({
        facilityId,
        periodDate,
        rows,
        entryMethod: "web_form",
        userId: dqm.id,
        metadata: {
          activity: "Monthly DQA",
          tbType: "DS-TB",
          staffName: dqm.name,
          dateOfVisit: periodDate,
          authority: "doh",
        },
        mismatches,
        statusOverride:
          periodDate === "2024-04-01" || periodDate === "2024-05-01"
            ? "reviewed_locked"
            : "submitted",
      });
    }
  }

  console.log("Sample facilities and months seeded.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
