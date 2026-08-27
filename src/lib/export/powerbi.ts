/**
 * Isolated MERL Officer transformation step.
 *
 * Currently a documented pass-through. Once confirmed against an actual
 * Power Query tab sample and the matching file sent to management for the
 * same month, put the real adjustment logic HERE — nowhere else.
 */
export type PowerBiExportRow = {
  Activity: string | null;
  "TB type": string | null;
  Dataset: string;
  "Staff name": string | null;
  "Date of visit": string | null;
  District: string | null;
  "Sub-district": string | null;
  "Facility Name": string;
  Authority: string | null;
  "Data type": string;
  "Age category": string;
  Element: string;
  "CIR/TB register": number | null;
  RMR: number | null;
  "TIER.Net": number | null;
  DHIS: number | null;
  Comments: string | null;
};

export function applyMerlTransformation(rows: PowerBiExportRow[]): PowerBiExportRow[] {
  // PASS-THROUGH — replace this body when MERL transforms are confirmed.
  return rows;
}

const SOURCE_TO_COL: Record<string, keyof PowerBiExportRow> = {
  register: "CIR/TB register",
  summary_sheet: "RMR",
  tier_net: "TIER.Net",
  dhis: "DHIS",
};

export function pivotEntriesToPowerBiRows(
  flat: {
    facilityName: string;
    district: string | null;
    subDistrict: string | null;
    activity: string | null;
    tbType: string | null;
    staffName: string | null;
    dateOfVisit: string | null;
    authority: string | null;
    stage: string;
    dataType: string;
    ageGroup: string;
    indicator: string;
    source: string;
    value: number;
    comments: string | null;
  }[]
): PowerBiExportRow[] {
  const map = new Map<string, PowerBiExportRow>();

  for (const e of flat) {
    const dataset = e.stage === "before" ? "Before" : "After";
    const key = [
      e.facilityName,
      dataset,
      e.dataType,
      e.ageGroup,
      e.indicator,
    ].join("|");

    let row = map.get(key);
    if (!row) {
      row = {
        Activity: e.activity,
        "TB type": e.tbType,
        Dataset: dataset,
        "Staff name": e.staffName,
        "Date of visit": e.dateOfVisit,
        District: e.district,
        "Sub-district": e.subDistrict,
        "Facility Name": e.facilityName,
        Authority: e.authority,
        "Data type": e.dataType,
        "Age category": e.ageGroup,
        Element: e.indicator,
        "CIR/TB register": null,
        RMR: null,
        "TIER.Net": null,
        DHIS: null,
        Comments: e.comments,
      };
      map.set(key, row);
    }
    const col = SOURCE_TO_COL[e.source];
    if (col) {
      (row as Record<string, unknown>)[col] = e.value;
    }
    if (e.comments) row.Comments = e.comments;
  }

  return applyMerlTransformation([...map.values()]);
}

export function rowsToCsv(rows: PowerBiExportRow[]): string {
  if (!rows.length) {
    return "Activity,TB type,Dataset,Staff name,Date of visit,District,Sub-district,Facility Name,Authority,Data type,Age category,Element,CIR/TB register,RMR,TIER.Net,DHIS,Comments\n";
  }
  const headers = Object.keys(rows[0]) as (keyof PowerBiExportRow)[];
  const escape = (v: unknown) => {
    if (v == null) return "";
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}
