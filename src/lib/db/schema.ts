import {
  pgTable,
  serial,
  bigserial,
  text,
  integer,
  numeric,
  date,
  timestamp,
  jsonb,
  primaryKey,
  index,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const facilities = pgTable("facilities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  district: text("district"),
  subDistrict: text("sub_district"),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull(), // 'dqm' | 'merl_officer'
  passwordHash: text("password_hash").notNull(),
});

export const entries = pgTable(
  "entries",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    facilityId: integer("facility_id")
      .notNull()
      .references(() => facilities.id),
    periodDate: date("period_date").notNull(),
    dataType: text("data_type").notNull(),
    ageGroup: text("age_group").notNull(),
    indicator: text("indicator").notNull(),
    source: text("source").notNull(),
    stage: text("stage").notNull(), // 'before' | 'after'
    value: numeric("value").notNull(),
    entryMethod: text("entry_method").notNull(), // 'web_form' | 'excel_upload' | 'correction'
    isCorrection: boolean("is_correction").notNull().default(false),
    correctionOfPeriodDate: date("correction_of_period_date"),
    capturedBy: integer("captured_by").references(() => users.id),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    comments: text("comments"),
  },
  (t) => [
    index("entries_facility_period_idx").on(t.facilityId, t.periodDate),
  ]
);

export const facilityMonthStatus = pgTable(
  "facility_month_status",
  {
    facilityId: integer("facility_id")
      .notNull()
      .references(() => facilities.id),
    periodDate: date("period_date").notNull(),
    status: text("status").notNull().default("submitted"), // submitted | reviewed_locked | exported
    lockedBy: integer("locked_by").references(() => users.id),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    activity: text("activity"),
    tbType: text("tb_type"),
    staffName: text("staff_name"),
    dateOfVisit: date("date_of_visit"),
    authority: text("authority"),
    mismatches: jsonb("mismatches").$type<MismatchFlag[]>().default([]),
  },
  (t) => [primaryKey({ columns: [t.facilityId, t.periodDate] })]
);

export type MismatchFlag = {
  indicator: string;
  ageGroup: string;
  stage: "before" | "after";
  sources: Record<string, number | null>;
  message: string;
};

export const auditLog = pgTable("audit_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  performedBy: integer("performed_by").references(() => users.id),
  performedAt: timestamp("performed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  detail: jsonb("detail"),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex("sessions_user_id_idx").on(t.userId)]
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
);
