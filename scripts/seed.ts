import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
import { saveEntries, upsertFacility } from "../src/lib/entries";
import { NMB_DISTRICT, NMB_FACILITIES } from "../src/lib/nmb-facilities";
import { CASCADE_STEPS } from "../src/lib/cascade-config";

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

  const facilityIds: number[] = [];
  for (const f of NMB_FACILITIES) {
    facilityIds.push(
      await upsertFacility({
        name: f.name,
        district: NMB_DISTRICT,
        subDistrict: f.subDistrict,
      })
    );
  }

  const seedFacilities = [
    "Motherwell CHC",
    "KwaMagxaki Clinic",
    "Zwide CHC",
    "New Brighton CHC",
    "Walmer CHC",
    "Laetitia Bam CHC",
    "Gelvandale Clinic",
    "KwaNobuhle Clinic 1",
  ];

  const seedIds = facilityIds.filter((_, i) =>
    seedFacilities.includes(NMB_FACILITIES[i].name)
  );

  const periods = ["2024-04-01", "2024-05-01", "2024-06-01", "2024-07-01", "2024-08-01", "2024-09-01", "2024-10-01"];
  const tbIndicators = CASCADE_STEPS["TB cascade"];
  const tptIndicators = CASCADE_STEPS.TPT;

  for (const periodDate of periods) {
    for (let fi = 0; fi < seedIds.length; fi++) {
      const facilityId = seedIds[fi];
      const facName = seedFacilities[fi];
      const rows: {
        dataType: string;
        ageGroup: string;
        indicator: string;
        source: string;
        stage: "before" | "after";
        value: number;
      }[] = [];

      for (const stage of ["before", "after"] as const) {
        for (const ageGroup of ["Under 5yrs", "Over 5yrs"] as const) {
          const ageMult = ageGroup === "Over 5yrs" ? 1 : 0.18;
          const periodIdx = periods.indexOf(periodDate);

          for (let si = 0; si < tbIndicators.length; si++) {
            const indicator = tbIndicators[si];
            const cascadeBase = Math.round(
              (300 + fi * 80 + periodIdx * 25) * ageMult * (1 - si * 0.12)
            );
            const sources: ("register" | "summary_sheet" | "tier_net" | "dhis")[] = [
              "register",
              "summary_sheet",
              "tier_net",
              "dhis",
            ];

            for (const source of sources) {
              let value = cascadeBase + sources.indexOf(source) * 2;
              if (stage === "after") value += 3;

              if (
                facName === "KwaMagxaki Clinic" &&
                periodDate === "2024-10-01" &&
                stage === "before" &&
                indicator === "TB screening" &&
                source === "dhis" &&
                ageGroup === "Over 5yrs"
              ) {
                value += 19;
              }

              rows.push({
                dataType: "TB cascade",
                ageGroup,
                indicator,
                source,
                stage,
                value: Math.max(0, value),
              });
            }
          }

          for (let ti = 0; ti < tptIndicators.length; ti++) {
            const indicator = tptIndicators[ti];
            const tptBase = Math.round(
              (40 + fi * 10 + periodIdx * 5) * ageMult * (1 - ti * 0.15)
            );
            for (const source of ["register", "summary_sheet", "tier_net", "dhis"] as const) {
              rows.push({
                dataType: "TPT",
                ageGroup,
                indicator,
                source,
                stage,
                value: Math.max(0, tptBase + (["register", "summary_sheet", "tier_net", "dhis"] as const).indexOf(source)),
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
        facName === "KwaMagxaki Clinic" && periodDate === "2024-10-01"
          ? [
              {
                indicator: "TB screening",
                ageGroup: "Over 5yrs",
                stage: "before" as const,
                sources: { register: 245, dhis: 264 },
                message:
                  "Mismatch on TB screening (Over 5yrs, before): register=245 vs dhis=264",
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
          periodDate <= "2024-05-01" ? "reviewed_locked" : "submitted",
      });
    }
  }

  console.log(`Seeded ${NMB_FACILITIES.length} NMB facilities (${seedIds.length} with demo data).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
