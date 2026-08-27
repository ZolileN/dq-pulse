# ACC1 DS-TB DQA Tool v3 — Excel Structure Report

**Workbook:** `/home/zolile/Documents/dq-pulse/reference/ACC1_DS-TB_DQA_tool_v3.xlsx`  
**Analysed with:** Node.js + exceljs (installed in `/tmp/exceljs-inspect`)  
**Date:** 2026-08-27

This report documents the workbook layout to drive a dynamic Excel parser. All row/column references use **1-based Excel indexing** (column A = 1, row 1 = first row).

---

## 1. All Sheet Names with Row/Column Counts

| Sheet name | Used rows | Used columns | Purpose |
|---|---:|---:|---|
| **Instructions** | 29 | 7 | Look-back rules, workflow guidance |
| **ICD10 codes** | 34 | 5 | Reference ICD-10 code lookup table |
| **Quality assurance** | 54 | 10 | Automated Before/After validation dashboard |
| **TB stationery checklist** | 11 | 6 | Stationery availability audit |
| **Before** | 81 | 17 | Pre-DQA data entry (primary parse target) |
| **After** | 73 | 17 | Post-DQA data entry (primary parse target) |
| **Training** | 25 | 29 | Staff training/mentorship log |
| **Training validation sheet** | 12 | 7 | Training topic checklist by period |
| **Power  Query** | 110 | 22 | Long-format unpivot (formula-driven export shape) |

**Tab order in workbook:** Instructions → ICD10 codes → Quality assurance → TB stationery checklist → Before → After → Training → Training validation sheet → Power  Query

---

## 2. Before and After Data Sheets

Both sheets share the same overall **wide-matrix** design: indicators in column B, multi-source columns C–P, validation/check columns interleaved, and comments in column Q. However, they differ in metadata layout, some header labels, section extent, and filled data.

### 2.1 Metadata Block (Rows 3–6)

#### Before sheet — metadata cell map

| Row | B (label) | C (value) | D | E | F | G |
|---|---|---|---|---|---|---|
| 3 | Dataset: | **Before** | Activity | Monthly DQA | TB type | DS-TB |
| 4 | Staff name | **Zolile Nonzapa** | **Soweto Clinic** *(facility value, no label)* | | | |
| 5 | Date of Visit | *(empty)* | NMB | | Authority | doh |
| 6 | Two months back: specify month | **Oct** *(text month)* | A | | | |

> **Parser note:** The Before sheet uses an **older/inconsistent metadata layout**. Facility name sits directly in D4 without a "Facility Name" label. District/sub-district are not populated. Date of visit is empty. Reporting month is free text ("Oct") not a date.

#### After sheet — metadata cell map (canonical layout)

| Row | B (label) | C (value) | D (label) | E (value) | F | G |
|---|---|---|---|---|---|---|
| 3 | Dataset: | **After** | Activity | Monthly DQA | TB type | DS-TB |
| 4 | Staff name | **Nkadimeng Rantsolase** | Facility Name | **Empilisweni CHC** | | |
| 5 | Date of Visit | **2024-08-01** *(date)* | District | **Sedibeng** | Authority | |
| 6 | Two months back: specify month | **2024-06-01** *(date)* | Sub-district | **Emfuleni** | | |

#### Recommended metadata extraction (dynamic, label-driven)

| Field | Primary detection strategy | Before sheet fallback | After sheet location |
|---|---|---|---|
| **dataset** | Cell where B=`"Dataset:"` → value in C | C3 = "Before" | C3 = "After" |
| **activity** | Row 3, col E | E3 = "Monthly DQA" | E3 = "Monthly DQA" |
| **tb_type** | Row 3, col G | G3 = "DS-TB" | G3 = "DS-TB" |
| **staff_name** | Row 4: B=`"Staff name"` → C | C4 | C4 |
| **facility_name** | Row 4: D=`"Facility Name"` → E; else D if not a known label | D4 (raw value) | E4 |
| **date_of_visit** | Row 5: B=`"Date of Visit"` → C | C5 (often empty) | C5 |
| **district** | Row 5: D=`"District"` → E | not present | E5 |
| **sub_district** | Row 6: D=`"Sub-district"` → E | not present | E6 |
| **authority** | Row 5: F=`"Authority"` → G | G5 = "doh" | not populated |
| **reporting_month** | Row 6: B=`"Two months back: specify month"` → C | C6 (text or date) | C6 (ISO date) |

Power Query tab confirms the intended canonical references for metadata (rows 3–6 of Before/After):

```
Staff name      → Before!$C$4 / After!$C$4
Date of visit   → Before!$C$5 / After!$C$5
District        → Before!$E$6 / After!$E$5   *(note: Before uses E6 inconsistently)*
Sub-district    → Before!$E$5 / After!$E$6   *(note: swapped vs After)*
Facility Name   → Before!$E$4 / After!$E$4
Authority       → Before!G$5 / After!G$5
Activity        → Before!E$3 / After!E$3
TB type         → Before!G$3 / After!G$3
Dataset         → Before!C$3 / After!C$3
```

> **Important:** Power Query references suggest Before metadata cells E4/E5/E6 may have been intended differently from current content. Parser should prefer **label-based** extraction over hardcoded coordinates.

---

### 2.2 Section Overview and Look-Back Periods

The sheet is divided into **six logical data_type sections**, each announced by a section title row in column B and/or a look-back instruction row.

| Section | data_type | Title row | Look-back row | Look-back rule | Data rows (approx) |
|---|---|---:|---:|---|---|
| TB Cascade | `TB cascade` | R9: "TB Cascade" | R10–11 | 2 months back | R12–R28 |
| TPT | `TPT` | R31: "TB TPT" | R30 + R31 | 2 months back | R32–R38 |
| TB register lists | `TB register lists` | R41: "Tier.Net/PHCIS/PreHMIS TB reports" | R40 | Before: "current data"; After: "2 months back" | R43–R52 |
| DSTB outcomes | `DSTB outcome` | R55: "DSTB outcomes" | R54 | 12 months back | R57–R73 |
| LF-LAM | `LFLAM` | R75: "LF-LAM" | *(none)* | current visit | R77–R81 |
| NHLS alerts | *(sub-section of TB cascade)* | R27 | — | 2 months back | R26–R28 |

**After sheet ends at row 73** — it does **not** include the LF-LAM section (rows 75–81 present only in Before).

---

### 2.3 Header Rows — Multi-Source Matrix Sections (TB Cascade & TPT)

These two sections use a **two-row header** at rows 10–11 (TB Cascade) and rows 30–31 (TPT). Row 10/30 defines **source groups**; row 11/31 defines **age groups** per value column.

#### Row 10 — Source group headers (TB Cascade)

| Col | A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Content | | Work on data 2 months back… | Tally sheet/TIR/TB register | Tally sheet/TIR/TB register | Monthly Summary Sheet* | Monthly Summary Sheet* | Check | *(empty)* | TIER.Net | TIER.Net | Check | *(empty)* | DHIS | *(empty)* | Check | *(empty)* | Comments |

\* After sheet uses **"Routine Monthly report"** instead of "Monthly Summary Sheet" in E10/F10.

**Merged ranges (row 10):** B10:B11, C10:D10, E10:F10, I10:J10

#### Row 11 — Age group sub-headers

| Col | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Content | Work on data 2 months back… | Under 5yrs | 5yrs & odler | Under 5yrs | Over 5yrs | Under 5yrs | Over 5yrs | Under 5yrs | Over 5yrs | Under 5yrs | Over 5yrs | Under 5yrs | Over 5yrs | Under 5yrs | Over 5yrs | Comments |

> Typo in workbook: **"5yrs & odler"** (not "older") in column D.

#### Column-to-(source, age_group) mapping — TB Cascade / TPT matrix

| Col | Source (row 10) | Age group (row 11) | Column role |
|---|---|---|---|
| C | Tally sheet/TIR/TB register | Under 5yrs | **Value** — primary register |
| D | Tally sheet/TIR/TB register | 5yrs & odler | **Value** — primary register |
| E | Monthly Summary Sheet / Routine Monthly report | Under 5yrs | **Value** — routine monthly report |
| F | Monthly Summary Sheet / Routine Monthly report | Over 5yrs | **Value** — routine monthly report |
| G | Check | Under 5yrs | **Validation** — TIR vs RMR (C vs E) |
| H | Check | Over 5yrs | **Validation** — TIR vs RMR (D vs F) |
| I | TIER.Net | Under 5yrs | **Value** — TIER.Net |
| J | TIER.Net | Over 5yrs | **Value** — TIER.Net |
| K | Check | Under 5yrs | **Validation** — RMR vs TIER (E vs I) |
| L | Check | Over 5yrs | **Validation** — RMR vs TIER (F vs J) |
| M | DHIS | Under 5yrs | **Value** — DHIS |
| N | DHIS | Over 5yrs | **Value** — DHIS |
| O | Check | Under 5yrs | **Validation** — TIER vs DHIS (I vs M) |
| P | Check | Over 5yrs | **Validation** — TIER vs DHIS (J vs N) |
| Q | Comments | — | Free text |

**Normalized source names for parser:**

| Raw header text | Normalized `source` |
|---|---|
| Tally sheet/TIR/TB register | `CIR/TB register` *(matches Power Query col N)* |
| Monthly Summary Sheet / Routine Monthly report | `RMR` |
| TIER.Net / TIER.Net/PHCIS/PreHMIS | `TIER.Net` |
| DHIS | `DHIS` |
| Check | `Check` *(validation only — skip for value extraction)* |

**Normalized age groups:**

| Raw text | Normalized `age_group` |
|---|---|
| Under 5yrs | `under_5` |
| 5yrs & odler / Over 5yrs | `over_5` |
| All ages *(TPT HIV rows)* | `all_ages` |

---

### 2.4 Header Rows — Other Section Layouts

#### TB Register Lists section (rows 40–52)

| Row | B | C | D |
|---|---|---|---|
| 40 | Work on data … for this section | | |
| 41 | Tier.Net/PHCIS/PreHMIS TB reports | | |
| 42 | *(empty)* | Number | Comments |

- **Columns:** C = count/number, D = comments (merged D43:K52 for each list row)
- **No age split, no multi-source matrix**
- **Source:** implicitly `TIER.Net/PHCIS/PreHMIS`
- **Indicators (column B):** rows 43–52

#### DSTB Outcomes section (rows 54–73)

| Row | B | C | D | E | F |
|---|---|---|---|---|---|
| 54 | Work on data 12 months back for this section | | | | |
| 55 | DSTB outcomes | | | | |
| 56 | *(empty)* | Patient file/ TB ID* | TIER.Net* | Check | Comments |

\* Before: C56=`"Patient file/ TB ID"`, D56=`"TIER.Net"`  
After: C56=`"Patient file/ TB register"`, D56=`"TIER.Net/PHCIS/PreHMIS"`

| Col | Role |
|---|---|
| C | **Value** — patient file / TB register count |
| D | **Value** — TIER.Net count |
| E | **Validation** — C vs D mismatch check |
| F | Comments (merged F57:K73 for outcome rows) |

- **No age split**
- **data_type:** `DSTB outcome`
- **age_group:** `all_ages`

#### LF-LAM section (rows 75–81, Before sheet only)

| Row | B | C | D |
|---|---|---|---|
| 75 | LF-LAM | | |
| 76 | Element | Data | Comments |
| 77–81 | Indicator names | Data values | Comments |

- **data_type:** `LFLAM`
- **Single value column** (C), no source comparison

#### NHLS Alerts sub-section (rows 26–28, within TB Cascade)

| Row | B | C | D |
|---|---|---|---|
| 26 | Count alerts for facility | Under 5yrs alerts | 5yrs & older alerts |
| 27 | NHLS ALERTS DS-TB | *(alert counts)* | *(alert counts)* |
| 28 | NHLS ALERT START RATE | validation formula | validation formula |

---

### 2.5 Indicator Inventory by Section

#### TB Cascade (rows 12–28)

| Row | Indicator (col B) | Type |
|---:|---|---|
| 12 | Headcount | count |
| 13 | TB screening | count |
| 14 | TB screening rate | **rate** (formula) |
| 15 | Client eligible for TB  test | count |
| 16 | TB presumptive rate | **rate** (formula) |
| 17 | TB test using GeneXpert | count |
| 18 | DS-TB clinically diagnosed | count |
| 19 | DS-TB Bacteriologically confirmed | count |
| 20 | RR-TB bacteriologically confirmed | count |
| 21 | DSTB confirmation rate | **rate** (formula) |
| 22 | DSTB treatment start | count |
| 23 | DSTB Treatment start rate | **rate** (formula) |
| 24 | Number initial lost to follow-up | **computed** (formula) |
| 25 | Initial lost to follow up rate | **rate** (formula) |
| 26 | Count alerts for facility | section sub-header |
| 27 | NHLS ALERTS DS-TB | alert counts |
| 28 | NHLS ALERT START RATE | validation |

#### TPT (rows 32–38)

| Row | Indicator (col B) | Notes |
|---:|---|---|
| 32 | TB contact | age-split matrix |
| 33 | TB contact start on TPT | age-split matrix |
| 34 | TPT  initiation rate | rate |
| 35 | HIV TPT | section sub-header |
| 36 | PLWHIV on ART eligible for TPT | uses C/D only (all-ages pattern) |
| 37 | PLWHIV on ART started TPT | uses C/D only |
| 38 | PLWHIV on ART started TPT rate | rate |

> Rows 36–37 validation formulas reference columns A/B instead of C/D in some cells — likely a workbook bug (`IF(A36=E36,...)` instead of `IF(C36=E36,...)`).

#### TB Register Lists (rows 43–52)

| Row | Indicator |
|---:|---|
| 43 | TB identification results outstanding list |
| 44 | Waiting for TB treatment list |
| 45 | DSTB coversion sputa required list |
| 46 | DSTB discharge sputa required list |
| 47 | DSTB outstanding outcomes list |
| 48 | HIV status missing |
| 49 | Early missed appointments *(After only)* |
| 50 | Late missed appointments *(After only)* |
| 51 | DSTB HIV&ART status (oustanding start) |
| 52 | Transfer out list |

#### DSTB Outcomes (rows 57–73)

| Row | Indicator | Type |
|---:|---|---|
| 57 | DSTB Treatment success | count |
| 58 | DSTB Treatment success rate | rate |
| 59 | DSTB LTFU | count |
| 60 | DSTB LTFU rate | rate |
| 61 | DSTB Treatment Failure | count |
| 62 | DSTB Treatment Failure rate | rate |
| 63 | DSTB Died | count |
| 64 | DSTB Died rate | rate |
| 65 | Not evaluated | count |
| 66 | Not evaluated rate | rate |
| 67 | DSTB Total | **computed** sum |
| 68 | DSTB Transfer out (TFO) | count |
| 69 | DSTB Transfer out (TFO) rate | rate |
| 70 | TB Rif resistant | count |
| 71 | TB MDR | count |
| 72 | TB Total all cases | **computed** sum |
| 73 | Duplicates found | count |

#### LF-LAM (rows 77–81, Before only)

| Row | Indicator |
|---:|---|
| 77 | Total eligile for LF LAM test |
| 78 | People with CD4 <200 |
| 79 | People with tested with ULAM |
| 80 | People with TB confirmed |
| 81 | People with started TB treatment |

---

### 2.6 Sample Data Rows (Before sheet, TB Cascade — 18 rows)

These rows show the full multi-source structure with actual values from the reference workbook:

```
Row 12  Headcount
        C=330  D=1967  E=330  F=1967  |  G=Check  H=Check  |  I=—  J=—  |  K=—  L=—  |  M=—  N=—  |  O=Check  P=Check

Row 13  TB screening
        C=330  D=1967  E=330  F=1967  |  G="data is correct"  H="data is correct"  |  O=Check  P="data is correct"

Row 15  Client eligible for TB test
        C=0  D=121  E=0  F=121  |  G=Check  H=Check  |  K=Check  L=Check  |  O=Check  P=Check

Row 17  TB test using GeneXpert
        C=0  D=119  E=0  F=119  |  G=Check  H="data is correct"  |  K=Check  L="correct data"  |  O=Check  P="data is correct"

Row 18  DS-TB clinically diagnosed
        C=0  D=1  E=0  F=1  |  all checks = "data is correct" or "correct data"

Row 19  DS-TB Bacteriologically confirmed
        C=0  D=20  E=0  F=20

Row 20  RR-TB bacteriologically confirmed
        C=0  D=2  E=0  F=2

Row 22  DSTB treatment start
        C=0  D=20  E=0  F=20  |  I=1  J=6  |  (TIER.Net values differ from RMR)

Row 24  Number initial lost to follow-up  [computed]
        C=(C18+C19)-C22  D=(D18+D19)-D22  E=(E18+E19)-E22  F=1

Row 32  TB contact (TPT section)
        C=0  D=0  |  validation checks in G,H,K,L,O,P

Row 36  PLWHIV on ART eligible for TPT
        C=0  D=0  (no E/F age-split values)

Row 57  DSTB Treatment success (12-month outcomes)
        C=65  D=65  E=Check("correct data" if mismatch)

Row 59  DSTB LTFU
        C=18  D=18

Row 67  DSTB Total  [computed]
        C=SUM(outcomes)  D=SUM(outcomes)

Row 72  TB Total all cases  [computed]
        C=complex sum  D=complex sum  E=Check
```

---

### 2.7 "Data is correct" / Mismatch Validation Columns

The workbook uses **three distinct validation patterns**:

#### Pattern A — Multi-source matrix checks (TB Cascade & TPT, cols G/H/K/L/O/P)

Formula template:
```excel
=IF(<sourceA>=<sourceB>, "data is correct", "correct data")
```

| Check col | Compares | Meaning |
|---|---|---|
| G | C vs E | TIR Under-5 vs RMR Under-5 |
| H | D vs F | TIR Over-5 vs RMR Over-5 |
| K | E vs I | RMR Under-5 vs TIER Under-5 |
| L | F vs J | RMR Over-5 vs TIER Over-5 |
| O | I vs M | TIER Under-5 vs DHIS Under-5 |
| P | J vs N | TIER Over-5 vs DHIS Over-5 |

**Parser should:** skip columns where row 10 = "Check" when extracting numeric values. Optionally capture validation status separately.

**Minor Before/After formula difference:** Before P12 uses `IF(J12=N12,...)` while After P12 uses `IF(F12=N12,...)` — likely a bug in Before (compares wrong pair).

#### Pattern B — NHLS alert check (row 28, cols C/D)

```excel
=IF(C19=C27, "data is correct", "update TIR with correct number")
```

Compares bacteriological confirmed count (row 19) against NHLS alert count (row 27).

#### Pattern C — DSTB outcome checks (col E, rows 57–73)

```excel
=IFERROR(IF(C<n>-D<n><>0, "correct data", ""), 0)
```

Flags mismatches between patient file count (C) and TIER.Net count (D). Empty string = match.

#### Pattern D — Rate/formula rows

Rows with `% rate` indicators and rows 14, 16, 21, 23, 25, 34, 38, 58, 60, 62, 64, 66, 69 contain **IFERROR division formulas**. These are derived, not primary data entry. Parser should classify by indicator name suffix `" rate"` or by detecting formula cells.

---

### 2.8 Before vs After Structural Comparison

| Aspect | Before | After | Identical? |
|---|---|---|---|
| Overall column layout (A–Q) | 17 cols | 17 cols | ✅ Yes |
| TB Cascade header rows 10–11 | Monthly Summary Sheet | Routine Monthly report | ⚠️ Label only |
| TPT header rows 30–31 | Same structure | Same structure | ✅ Yes |
| Metadata layout | Legacy (facility in D4) | Canonical label/value pairs | ❌ No |
| TB Cascade data values | Populated (sample facility) | Empty template | ❌ No |
| Lists look-back (row 40) | "current data" | "2 months back" | ❌ No |
| Lists rows 49–50 | Not present | Early/late missed appointments | ❌ No |
| Outcomes header (row 56) | Patient file/ TB ID + TIER.Net | Patient file/ TB register + TIER.Net/PHCIS/PreHMIS | ⚠️ Label only |
| LF-LAM section (75–81) | Present | **Absent** (sheet ends R73) | ❌ No |
| Row count | 81 | 73 | ❌ No |

**Conclusion:** The two sheets are **structurally homologous** for rows 9–73 with minor header label differences. Parser logic should be shared; account for Before's shorter metadata, optional LF-LAM section, and label synonyms.

---

## 3. Instructions Tab — Look-Back Rules

Full extracted text from the Instructions sheet:

### General workflow rules (rows 5–13)

| # | Rule |
|---|---|
| 1 | **Work on data 2 months from the current month** — e.g. if in July, work on May data |
| 2 | Complete DQA with the calendar month; collect **before data** first week, **after data** last 2 weeks |
| 3 | Give clear guidance to DoH staff on correcting data after completing before-DQA |
| 4 | **DSTB outcomes:** work on cohort started treatment **12 months ago** (e.g. July 2022 → July 2021 cohort) |
| 5 | **DRTB outcomes:** work on cohort started treatment **24 months ago** (e.g. July 2022 → July 2020 cohort) |
| 6 | Grey cells have formula — do not insert data |
| 7 | Red cell color = review and correct data |
| 8 | Complete Training dashboard per facility visit book |
| 9 | Ignore Power Query tab (for further analysis) |

### Section-specific look-back notes (rows 15–25)

| Section | Look-back rule | Detail |
|---|---|---|
| **Conversions** | 2 months back | Patients due for conversion (e.g. started March 2023) |
| **Discharge** | 2 months back + 5 months | "People would have started treatment 5 months back" — e.g. 2 months back in March → go 5 months back to Oct 2022. **Effective look-back: ~7 months** from current for treatment start cohort |
| **Outstanding outcomes list** | 2 months back + 5 months | Same 7-month logic as discharge |
| **HIV/ART** | Filter from patient list | Report lacks patient-level data |
| **Outcome report (DSTB)** | **12 months back** | Total outcomes; filter since report may not be out yet |

### Look-back summary for parser

| data_type | look_back_months | Notes |
|---|---:|---|
| TB cascade | 2 | Row 10/11 header text |
| TPT | 2 | Row 30/31 |
| TB register lists | 2 (After) / 0 (Before "current") | Row 40 |
| Conversions / Discharge / Outstanding | 2 + 5 = **7** | Instructions rows 16–20; maps to list indicators rows 45–47 |
| DSTB outcomes | **12** | Row 54 header |
| DRTB outcomes | **24** | Instructions only — **no DRTB section in workbook v3** |
| LF-LAM | 0 (current visit) | No look-back header |

---

## 4. Power Query Tab — Long-Format Export Shape

Sheet name: **`Power  Query`** (note: two spaces). Row 2 is the header row. Rows 3–62 reference **Before** sheet; rows 63–97 reference **Before** Over-5 unpivot; rows 98–110 reference **After** sheet.

### Column headers (row 2)

| Col | Header | Maps to |
|---|---|---|
| B | Activity | Before/After E3 |
| C | TB type | Before/After G3 |
| D | Dataset | Before/After C3 ("Before"/"After") |
| E | Staff name | C4 |
| F | Date of visit | C5 |
| G | District | E6 (Before) / E5 (After) |
| H | Sub-district | E5 (Before) / E6 (After) |
| I | Facility Name | E4 |
| J | Authority | G5 |
| K | **Data type** | Section name (literal or implied) |
| L | **Age category** | Under 5yrs / Over 5 years / All ages |
| M | **Element** | Indicator name (= column B of source row) |
| N | CIR/TB register | Column C or D value |
| O | RMR | Column E or F value |
| P | TIER.Net | Column I or J value |
| Q | DHIS | Column M or N value |
| R | Staff trained | Training sheet |
| S | Content of training/mentorship | Training sheet |
| T | Staff position | Training sheet |
| U | Stationery version | TB stationery checklist |
| V | Comments regarding sationery | TB stationery checklist |

### Unique data_type values in Power Query

1. `TB cascade`
2. `TPT`
3. `DSTB outcome`
4. `TB register lists`
5. `LFLAM`
6. `TB stationery`
7. `Training`

### Unique age_category values

- `Under 5yrs`
- `Over 5 years`
- `All ages`
- *(stationery rows reference TB stationery checklist)*

### Power Query as parser validation oracle

The Power Query sheet defines the **canonical long-format target schema**. A correct parser should produce rows matching:

```
(dataset, activity, tb_type, staff_name, date_of_visit, district, sub_district,
 facility_name, authority, data_type, age_group, indicator, source, value)
```

…where `source` ∈ {`CIR/TB register`, `RMR`, `TIER.Net`, `DHIS`} and values come from the corresponding wide-matrix columns.

---

## 5. Other Sheets

### 5.1 Quality assurance (54 × 10)

Automated validation dashboard referencing Power Query unpivoted data. Compares Before vs After values with tolerance checks (>5% difference → "confirm if data is correct") and cross-system checks (RMR vs DHIS, TIER vs DHIS, TB ID vs DHIS).

**Not a parser input** — useful for understanding expected validation logic.

Key columns (row 2): Data type | Age category | Element | Before | After | Validation result | Before | After | Validation result | TB/ID vs TIER.NET vs DHIS

### 5.2 TB stationery checklist (11 × 6)

| Row | B | C | D | E | F |
|---|---|---|---|---|---|
| 3 | Name of stationery | Period of verification | Availability | Stationery version (year) | Comments |

Stationery items (rows 4–11): Integrated file, TB ID register (DS-TB), DR-TB ID register, PHC comprehensive tick register, Summary sheet, TPT register, Contact line list register, Transfer out register.

Referenced by Power Query for `TB stationery` data_type rows.

### 5.3 Training (25 × 29)

Row 2: Section title — "Training / Mentorship / orientation"  
Row 3: Headers — Aurum Staff Initials, Date of Visit, Type of intervention, Training/Mentorship content (×3), DoH Staff Name, Title of staff trained (×2), Outcome/time columns (×9), Follow-up visit dates (×9)

Mostly empty in reference workbook. Referenced by Power Query cols R–T.

### 5.4 Training validation sheet (12 × 7)

Checklist of training topics with period columns (Oct 2024–Apr 2025, Apr 2025–Sep 2025) and completion counts.

Topics: TIER.Net data capturing, ICD10 codes, Updating clinical stationery, QIP development, TD ID completion, DHIS data verification, TIER.Net & DHIS triangulation, Monthly feedback, DQA best practices, Verification of monthly data on DHIS.

### 5.5 ICD10 codes (34 × 5)

Reference lookup: PTB/EPTB classification, ICD Code, Definition, Type Sample/Type Test. Not parsed for DQA data.

---

## 6. Recommended Parser Strategy

### 6.1 High-Level Algorithm

```
1. Open workbook; select sheet "Before" or "After"
2. Extract metadata via label-matching (rows 3–6)
3. Walk rows top-to-bottom maintaining current section context
4. On section boundary → update (data_type, look_back, column_map)
5. On indicator row → emit value records for all value columns in column_map
6. Skip rate rows, check columns, formula-only cells, empty rows
7. Normalize source names and age groups
8. Return flat array matching Power Query schema
```

### 6.2 Section Detection (no hardcoded row numbers)

Use **content patterns in column B** rather than fixed rows:

| Detect | Pattern in col B | Action |
|---|---|---|
| Section title | Exact match or contains: "TB Cascade", "TB TPT", "LF-LAM", "DSTB outcomes", "Tier.Net" | Set `data_type` |
| Look-back header | Contains "Work on data" AND ("months back" OR "current data") | Set `look_back_months` |
| Source header row | Row has ≥3 non-empty cells in C–P with source names AND next row has age groups | Build `column_map` |
| Age header row | Contains "Under 5yrs" in col C and "5yrs" or "Over 5" in col D | Confirm `column_map` |
| Sub-section header | "HIV TPT", "Count alerts", "NHLS ALERTS" | Set sub-context; don't emit |
| List header | Col C = "Number" AND col D = "Comments" | Switch to list layout (C=value, D=comment) |
| Outcome header | Col C contains "Patient file" AND col D contains "TIER" | Switch to outcome layout (C,D=value; E=check) |
| LF-LAM header | Col B = "Element" AND col C = "Data" | Switch to simple layout (C=value) |
| Indicator row | Col B non-empty, not matching above patterns, row ≥ first data row | Extract indicator + values |
| Rate row | Col B ends with " rate" OR all value cells are formulas | Skip or mark as derived |
| Empty row | Col B empty and no values in C–P | Skip |

### 6.3 Dynamic Column Map Construction

For matrix sections, build column map from the **paired header rows**:

```javascript
function buildColumnMap(headerRowSource, headerRowAge) {
  const columns = [];
  let currentSource = null;

  for (let col = 3; col <= 16; col++) {
    const sourceCell = getCell(headerRowSource, col);
    const ageCell = getCell(headerRowAge, col);

    // Forward-fill merged source headers
    if (sourceCell && sourceCell !== 'Check') currentSource = normalizeSource(sourceCell);
    if (!sourceCell && col > 3) { /* use currentSource from merge */ }

    const ageGroup = normalizeAgeGroup(ageCell);
    const role = getCell(headerRowSource, col) === 'Check' ? 'check'
               : ageCell?.match(/Under 5|Over 5|5yrs/) ? 'value'
               : 'unknown';

    if (role === 'value') {
      columns.push({ col, source: currentSource, age_group: ageGroup, role });
    } else if (role === 'check') {
      columns.push({ col, source: 'Check', age_group: ageGroup, role });
    }
  }
  return columns;
}
```

**Forward-fill rule:** Row 10/30 uses merged cells — source names span two columns (C–D, E–F, I–J, M–N). When row 10 cell is empty but row 11 has an age group, inherit source from the nearest left non-empty row-10 cell.

**Check column pairing:** Check columns immediately follow their comparison pair:
- G/H check C/D vs E/F
- K/L check E/F vs I/J
- O/P check I/J vs M/N

### 6.4 Row Classification Decision Tree

```
Column B text?
├── empty → skip row
├── "Work on data..." → look-back context row; skip
├── "TB Cascade" / "TB TPT" / "LF-LAM" / "DSTB outcomes" → section title; skip
├── "Tier.Net/PHCIS..." → list section title; skip
├── ends with " rate" → derived; skip
├── col C = "Number" → list column header; skip
├── col C = "Patient file" → outcome column header; skip
├── col B = "Element" → LF-LAM column header; skip
├── contains "alerts" (row 26-27) → alert sub-section; parse specially
└── otherwise → INDICATOR ROW → extract values
```

### 6.5 Value Extraction Rules

1. **Skip** cells containing formulas (detect via exceljs `cell.formula`)
2. **Skip** columns with `role = 'check'`
3. **Skip** `"data is correct"`, `"correct data"`, `"update TIR with correct number"` string values
4. **Parse numeric** values as numbers; preserve 0
5. **Empty cell** → omit or emit null (don't emit zero)
6. For **list section**: value = col C, comment = col D
7. For **outcome section**: sources = `patient_file` (C), `TIER.Net` (D)
8. For **LF-LAM**: value = col C only

### 6.6 Handling Before/After Differences

```javascript
const SOURCE_SYNONYMS = {
  'monthly summary sheet': 'RMR',
  'routine monthly report': 'RMR',
  'tally sheet/tir/tb register': 'CIR/TB register',
  'tier.net/phcis/prehmis': 'TIER.Net',
  'tier.net': 'TIER.Net',
  'patient file/ tb id': 'patient_file',
  'patient file/ tb register': 'patient_file',
};

const AGE_SYNONYMS = {
  'under 5yrs': 'under_5',
  'over 5yrs': 'over_5',
  '5yrs & odler': 'over_5',
  'over 5 years': 'over_5',
  'all ages': 'all_ages',
};
```

### 6.7 Output Record Schema

```typescript
interface DqaRecord {
  dataset: 'Before' | 'After';
  activity: string;           // "Monthly DQA"
  tb_type: string;            // "DS-TB"
  staff_name: string;
  date_of_visit: string | null;
  district: string | null;
  sub_district: string | null;
  facility_name: string;
  authority: string | null;
  data_type: string;          // TB cascade | TPT | TB register lists | DSTB outcome | LFLAM
  look_back_months: number | null;
  age_group: string;          // under_5 | over_5 | all_ages
  indicator: string;          // from column B
  source: string;             // CIR/TB register | RMR | TIER.Net | DHIS | patient_file
  value: number | null;
  comment: string | null;
  row_number: number;         // for traceability
  column: string;             // e.g. "C"
}
```

### 6.8 Alternative: Power Query-Guided Parsing

Since the Power Query tab already defines **exactly which (row, column) pairs** to extract for each long-format record, a robust alternative strategy is:

1. Parse Power Query sheet formulas (`=Before!C12`, `=Before!B13`, etc.)
2. Build an extraction manifest from PQ rows 3–110
3. Resolve formula references to fetch values directly

**Pros:** Handles all section-specific quirks (All ages TPT rows, list rows, outcome rows) without reimplementing layout logic.  
**Cons:** Depends on PQ tab being present and formula-correct; won't work if PQ is removed.

**Recommended approach:** Implement dynamic header-based parser (§6.1–6.7) as primary, use Power Query cross-validation in tests.

### 6.9 Test Validation Checklist

- [ ] Before TB Cascade: 17 indicators × 4 sources × 2 age groups = ~136 value records (minus rates/blanks)
- [ ] Metadata extracted correctly for both Before (legacy) and After (canonical) layouts
- [ ] Source normalization handles "Monthly Summary Sheet" ↔ "Routine Monthly report"
- [ ] Age group "5yrs & odler" mapped to `over_5`
- [ ] Check/validation columns excluded from value output
- [ ] DSTB outcomes produce `all_ages` records with 2 sources
- [ ] List section produces single-value records with TIER.Net source
- [ ] LF-LAM parsed only from Before sheet
- [ ] Output matches Power Query long-format for same input file
- [ ] DRTB 24-month section gracefully absent (instructions mention it, sheet doesn't implement it)

---

## Appendix A: Merged Cell Ranges (Before Sheet)

These merges affect header forward-fill logic:

| Range | Purpose |
|---|---|
| B10:B11 | Look-back label (rows merged) |
| C10:D10 | TIR/TB register source span |
| E10:F10 | RMR source span |
| I10:J10 | TIER.Net source span |
| C30:D30, E30:F30, I30:J30 | TPT section source spans |
| D43:K43 … D52:K52 | List row comment merges |
| F57:K57 … F65:K65, F68:K68, F70:K71 | Outcome comment merges |
| D51:K51, D52:K52 | HIV/ART list merges |

When exceljs reports empty cells in merged ranges, forward-fill from the top-left cell of the merge.

---

## Appendix B: Known Workbook Quirks

1. **"5yrs & odler"** typo in age group header (column D)
2. **Before metadata layout** inconsistent with After (facility in D4 without label)
3. **Before P-column check formulas** may compare wrong column pairs (J vs F)
4. **TPT rows 36–37** validation references columns A/B instead of C/D
5. **DRTB 24-month outcomes** described in Instructions but not implemented in sheet
6. **After sheet** lacks LF-LAM section and rows 49–50 (missed appointments)
7. **Before row 40** says "current data" vs After "2 months back" for lists section
8. **Rate indicator formulas** differ slightly between Before/After (e.g. TB presumptive rate uses E13 vs C13 denominator)
9. **Power Query** metadata references (E5/E6) don't match actual Before sheet content — use label-based parsing

---

*End of report.*
