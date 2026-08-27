import ExcelJS from "exceljs";
import {
  isRateIndicator,
  normalizeAgeGroup,
  normalizeSource,
} from "../indicators";
import { isDstbComputedIndicator, withDstbComputedRows } from "../dstb-computed";
import type { MismatchFlag } from "../db/schema";

export type ParsedEntry = {
  dataType: string;
  ageGroup: string;
  indicator: string;
  source: string;
  stage: "before" | "after";
  value: number;
  comments?: string;
};

export type ParsedWorkbook = {
  metadata: {
    facilityName: string | null;
    district: string | null;
    subDistrict: string | null;
    staffName: string | null;
    dateOfVisit: string | null;
    periodDate: string | null;
    activity: string | null;
    tbType: string | null;
    authority: string | null;
  };
  entries: ParsedEntry[];
  mismatches: MismatchFlag[];
  warnings: string[];
};

type ColMap = { col: number; source: string; ageGroup: string };

function cellText(cell: ExcelJS.Cell | undefined): string {
  if (!cell || cell.value == null) return "";
  const v = cell.value;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return String(v).trim();
  }
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("result" in v && v.result != null) return String(v.result).trim();
    if ("text" in v && typeof (v as { text?: string }).text === "string") {
      return (v as { text: string }).text.trim();
    }
    if ("richText" in v && Array.isArray((v as { richText: { text: string }[] }).richText)) {
      return (v as { richText: { text: string }[] }).richText.map((r) => r.text).join("").trim();
    }
    if ("formula" in v) return "";
  }
  return String(v).trim();
}

function cellNumber(cell: ExcelJS.Cell | undefined): number | null {
  if (!cell || cell.value == null || cell.value === "") return null;
  const v = cell.value;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "object" && v) {
    if ("result" in v) {
      const r = (v as { result?: unknown }).result;
      if (typeof r === "number" && Number.isFinite(r)) return r;
      if (typeof r === "string" && r.trim() !== "" && !Number.isNaN(Number(r))) {
        return Number(r);
      }
      return null;
    }
    if ("sharedFormula" in v || "formula" in v) {
      // Uncached formula — try text fallback
      const t = cellText(cell);
      if (t !== "" && !Number.isNaN(Number(t))) return Number(t);
      return null;
    }
  }
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  // Last resort: formatted text
  try {
    const t = String(cell.text ?? "").trim();
    if (t !== "" && !Number.isNaN(Number(t))) return Number(t);
  } catch {
    /* ignore */
  }
  return null;
}

function findLabelValue(
  sheet: ExcelJS.Worksheet,
  label: string,
  maxRow = 8,
  maxCol = 10
): string | null {
  for (let r = 1; r <= maxRow; r++) {
    for (let c = 1; c <= maxCol; c++) {
      const t = cellText(sheet.getCell(r, c));
      if (t.toLowerCase().replace(/:$/, "") === label.toLowerCase().replace(/:$/, "")) {
        return cellText(sheet.getCell(r, c + 1)) || null;
      }
    }
  }
  return null;
}

function parseDateLike(raw: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime()) && /\d{4}/.test(raw)) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
  }
  const months: Record<string, number> = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
    aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9,
    nov: 10, november: 10, dec: 11, december: 11,
  };
  const key = raw.trim().toLowerCase();
  if (key in months) {
    const now = new Date();
    let year = now.getFullYear();
    const month = months[key];
    if (month > now.getMonth()) year -= 1;
    return `${year}-${String(month + 1).padStart(2, "0")}-01`;
  }
  return null;
}

function detectDataType(b: string): string | null {
  const t = b.toLowerCase();
  if (t === "tb cascade" || t.includes("tb cascade")) return "TB cascade";
  if (t === "tb tpt" || t.includes("tb tpt") || t === "tpt") return "TPT";
  if (t.includes("dstb outcome")) return "DSTB outcome";
  if (t.includes("drtb outcome")) return "DRTB outcome";
  if (t.includes("lf-lam") || t === "lflam") return "LFLAM";
  if (t.includes("tier.net") || t.includes("phcis") || t.includes("prehmis")) {
    return "TB register lists";
  }
  return null;
}

function isSkipRow(b: string): boolean {
  if (!b) return true;
  const t = b.toLowerCase();
  if (t.startsWith("work on data")) return true;
  if (t === "element" || t === "number" || t.includes("patient file")) return true;
  if (t.includes("hiv tpt") || t.includes("count alerts")) return true;
  if (t.includes("nhls alert start")) return true;
  if (/comments/i.test(t) && t.length < 20) return true;
  return false;
}

function buildColumnMap(
  sheet: ExcelJS.Worksheet,
  sourceRow: number,
  ageRow: number
): ColMap[] {
  const maps: ColMap[] = [];
  let lastSource: string | null = null;
  for (let c = 3; c <= 16; c++) {
    const sourceRaw = cellText(sheet.getCell(sourceRow, c)) || lastSource || "";
    if (cellText(sheet.getCell(sourceRow, c))) {
      lastSource = cellText(sheet.getCell(sourceRow, c));
    }
    const ageRaw = cellText(sheet.getCell(ageRow, c));
    const source = normalizeSource(sourceRaw);
    const ageGroup = normalizeAgeGroup(ageRaw) ?? "All ages";
    if (!source) continue;
    maps.push({ col: c, source, ageGroup });
  }
  return maps;
}

function looksLikeSourceHeader(sheet: ExcelJS.Worksheet, row: number): boolean {
  let hits = 0;
  for (let c = 3; c <= 16; c++) {
    const t = cellText(sheet.getCell(row, c));
    if (normalizeSource(t) || /^check$/i.test(t)) hits++;
  }
  return hits >= 3;
}

function looksLikeAgeHeader(sheet: ExcelJS.Worksheet, row: number): boolean {
  const c = cellText(sheet.getCell(row, 3));
  const d = cellText(sheet.getCell(row, 4));
  return /under\s*5/i.test(c) && (/5yrs|over\s*5/i.test(d) || /older|odler/i.test(d));
}

function detectMismatches(
  entries: ParsedEntry[],
  stage: "before" | "after"
): MismatchFlag[] {
  const flags: MismatchFlag[] = [];
  const byKey = new Map<string, Record<string, number>>();
  for (const e of entries.filter((x) => x.stage === stage)) {
    const key = `${e.indicator}||${e.ageGroup}||${e.dataType}`;
    const bucket = byKey.get(key) ?? {};
    bucket[e.source] = e.value;
    byKey.set(key, bucket);
  }

  for (const [key, sources] of byKey) {
    const [indicator, ageGroup] = key.split("||");
    const pairs: [string, string][] = [
      ["register", "summary_sheet"],
      ["summary_sheet", "tier_net"],
      ["tier_net", "dhis"],
      ["register", "tier_net"],
    ];
    for (const [a, b] of pairs) {
      if (sources[a] == null || sources[b] == null) continue;
      if (Number(sources[a]) !== Number(sources[b])) {
        flags.push({
          indicator,
          ageGroup,
          stage,
          sources: { ...sources },
          message: `Mismatch on ${indicator} (${ageGroup}, ${stage}): ${a}=${sources[a]} vs ${b}=${sources[b]}`,
        });
      }
    }
  }
  return flags;
}

function parseStageSheet(
  sheet: ExcelJS.Worksheet,
  stage: "before" | "after"
): { entries: ParsedEntry[]; warnings: string[] } {
  const entries: ParsedEntry[] = [];
  const warnings: string[] = [];
  let dataType = "TB cascade";
  let layout: "matrix" | "list" | "outcome" | "simple" = "matrix";
  let columnMap: ColMap[] = [];

  const maxRow = sheet.rowCount || 100;
  for (let r = 1; r <= maxRow; r++) {
    const b = cellText(sheet.getCell(r, 2));
    const cText = cellText(sheet.getCell(r, 3));
    const dText = cellText(sheet.getCell(r, 4));

    const section = detectDataType(b);
    if (section) {
      dataType = section;
      if (section === "TB register lists") layout = "list";
      else if (section === "DSTB outcome" || section === "DRTB outcome") layout = "outcome";
      else if (section === "LFLAM") layout = "simple";
      else layout = "matrix";
      continue;
    }

    if (looksLikeSourceHeader(sheet, r) && looksLikeAgeHeader(sheet, r + 1)) {
      columnMap = buildColumnMap(sheet, r, r + 1);
      layout = "matrix";
      continue;
    }
    if (looksLikeAgeHeader(sheet, r)) continue;

    if (/^number$/i.test(cText) && /comments/i.test(dText)) {
      layout = "list";
      continue;
    }
    if (/patient file/i.test(cText) && /tier/i.test(dText)) {
      layout = "outcome";
      continue;
    }
    if (/^element$/i.test(b) && /^data$/i.test(cText)) {
      layout = "simple";
      continue;
    }

    if (isSkipRow(b) || isRateIndicator(b) || isDstbComputedIndicator(b)) continue;
    if (!b || b.length < 2) continue;

    if (layout === "matrix" && columnMap.length) {
      for (const m of columnMap) {
        const n = cellNumber(sheet.getCell(r, m.col));
        if (n == null) continue;
        entries.push({
          dataType,
          ageGroup: m.ageGroup,
          indicator: b,
          source: m.source,
          stage,
          value: n,
          comments: cellText(sheet.getCell(r, 17)) || undefined,
        });
      }
      continue;
    }

    if (layout === "list") {
      const n = cellNumber(sheet.getCell(r, 3));
      if (n == null) continue;
      entries.push({
        dataType: "TB register lists",
        ageGroup: "All ages",
        indicator: b,
        source: "tier_net",
        stage,
        value: n,
        comments: cellText(sheet.getCell(r, 4)) || undefined,
      });
      continue;
    }

    if (layout === "outcome") {
      const nReg = cellNumber(sheet.getCell(r, 3));
      const nTier = cellNumber(sheet.getCell(r, 4));
      if (nReg != null) {
        entries.push({
          dataType,
          ageGroup: "All ages",
          indicator: b,
          source: "register",
          stage,
          value: nReg,
        });
      }
      if (nTier != null) {
        entries.push({
          dataType,
          ageGroup: "All ages",
          indicator: b,
          source: "tier_net",
          stage,
          value: nTier,
        });
      }
      continue;
    }

    if (layout === "simple") {
      const n = cellNumber(sheet.getCell(r, 3));
      if (n == null) continue;
      entries.push({
        dataType: "LFLAM",
        ageGroup: "All ages",
        indicator: b,
        source: "register",
        stage,
        value: n,
        comments: cellText(sheet.getCell(r, 4)) || undefined,
      });
    }
  }

  if (!entries.length) {
    warnings.push(`No numeric entries parsed from ${stage} sheet.`);
  }
  return { entries, warnings };
}

function extractMetadata(sheet: ExcelJS.Worksheet) {
  const staffName = findLabelValue(sheet, "Staff name");
  let facilityName = findLabelValue(sheet, "Facility Name");
  if (!facilityName) {
    // Before sheet legacy: facility often in D4
    const d4 = cellText(sheet.getCell(4, 4));
    if (d4 && !/facility|activity|district/i.test(d4)) facilityName = d4;
  }
  const district = findLabelValue(sheet, "District");
  const subDistrict = findLabelValue(sheet, "Sub-district") || findLabelValue(sheet, "Sub-district");
  const dateOfVisit = parseDateLike(findLabelValue(sheet, "Date of Visit"));
  const periodRaw =
    findLabelValue(sheet, "Two months back: specify month") ||
    cellText(sheet.getCell(6, 3));
  const periodDate = parseDateLike(periodRaw);
  const activity = findLabelValue(sheet, "Activity") || cellText(sheet.getCell(3, 5)) || null;
  const tbType = findLabelValue(sheet, "TB type") || cellText(sheet.getCell(3, 7)) || null;
  const authority = findLabelValue(sheet, "Authority") || cellText(sheet.getCell(5, 7)) || null;

  return {
    facilityName: facilityName || null,
    district: district || null,
    subDistrict: subDistrict || null,
    staffName: staffName || null,
    dateOfVisit,
    periodDate,
    activity,
    tbType,
    authority,
  };
}

export async function parseDqaWorkbook(
  buffer: ArrayBuffer | Buffer
): Promise<ParsedWorkbook> {
  const wb = new ExcelJS.Workbook();
  // exceljs accepts Buffer | ArrayBuffer via read
  await wb.xlsx.load(buffer as ExcelJS.Buffer);

  const before = wb.getWorksheet("Before");
  const after = wb.getWorksheet("After");
  if (!before && !after) {
    throw new Error('Workbook must contain a "Before" and/or "After" sheet.');
  }

  const metaSheet = after ?? before!;
  const metadata = extractMetadata(metaSheet);
  // Prefer After metadata when both exist; fill gaps from Before
  if (before && after) {
    const beforeMeta = extractMetadata(before);
    for (const key of Object.keys(metadata) as (keyof typeof metadata)[]) {
      if (!metadata[key] && beforeMeta[key]) metadata[key] = beforeMeta[key];
    }
  }

  const warnings: string[] = [];
  const entries: ParsedEntry[] = [];

  if (before) {
    const parsed = parseStageSheet(before, "before");
    entries.push(...parsed.entries);
    warnings.push(...parsed.warnings);
  }
  if (after) {
    const parsed = parseStageSheet(after, "after");
    entries.push(...parsed.entries);
    warnings.push(...parsed.warnings);
  }

  const mismatches = [
    ...detectMismatches(entries, "before"),
    ...detectMismatches(entries, "after"),
  ];

  return {
    metadata,
    entries: withDstbComputedRows(entries),
    mismatches,
    warnings,
  };
}
