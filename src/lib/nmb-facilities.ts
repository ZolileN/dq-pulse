/**
 * Nelson Mandela Bay Health District (NMBHD) facilities from the official
 * PHC & hospital services list. Public CHCs, clinics, and TB hospitals only.
 */
export type NmbFacility = {
  name: string;
  subDistrict: "Sub-District A" | "Sub-District B" | "Sub-District C";
  type: "CHC" | "Clinic" | "TB Hospital" | "Hospital";
};

export const NMB_DISTRICT = "Nelson Mandela Bay";

export const NMB_FACILITIES: NmbFacility[] = [
  // Sub-District A
  { name: "Empilweni TB Hospital", subDistrict: "Sub-District A", type: "TB Hospital" },
  { name: "Motherwell CHC", subDistrict: "Sub-District A", type: "CHC" },
  { name: "Zwide CHC", subDistrict: "Sub-District A", type: "CHC" },
  { name: "Govan Mbeki CHC", subDistrict: "Sub-District A", type: "CHC" },
  { name: "New Brighton CHC", subDistrict: "Sub-District A", type: "CHC" },
  { name: "Zwide Clinic", subDistrict: "Sub-District A", type: "Clinic" },
  { name: "Joe Slovo Clinic", subDistrict: "Sub-District A", type: "Clinic" },
  { name: "Tsangane Clinic", subDistrict: "Sub-District A", type: "Clinic" },
  { name: "Sondabela Clinic", subDistrict: "Sub-District A", type: "Clinic" },
  { name: "New Brighton Clinic", subDistrict: "Sub-District A", type: "Clinic" },
  { name: "NU 2 Clinic", subDistrict: "Sub-District A", type: "Clinic" },
  { name: "NU 8 Clinic", subDistrict: "Sub-District A", type: "Clinic" },
  { name: "NU 10 Clinic", subDistrict: "Sub-District A", type: "Clinic" },
  { name: "NU 11 Clinic", subDistrict: "Sub-District A", type: "Clinic" },
  { name: "Kamvelihle Clinic", subDistrict: "Sub-District A", type: "Clinic" },
  { name: "Wells Estate Clinic", subDistrict: "Sub-District A", type: "Clinic" },
  { name: "KwaMagxaki Clinic", subDistrict: "Sub-District A", type: "Clinic" },
  { name: "KwaDwesi Clinic", subDistrict: "Sub-District A", type: "Clinic" },
  { name: "Soweto-on-Sea Clinic", subDistrict: "Sub-District A", type: "Clinic" },
  { name: "Veeplaas Clinic", subDistrict: "Sub-District A", type: "Clinic" },
  { name: "Masakhane Clinic", subDistrict: "Sub-District A", type: "Clinic" },
  // Sub-District B
  { name: "Laetitia Bam CHC", subDistrict: "Sub-District B", type: "CHC" },
  { name: "Khayamnandi Clinic", subDistrict: "Sub-District B", type: "Clinic" },
  { name: "Despatch Clinic", subDistrict: "Sub-District B", type: "Clinic" },
  { name: "Rosedale Clinic", subDistrict: "Sub-District B", type: "Clinic" },
  { name: "KwaNobuhle Clinic 1", subDistrict: "Sub-District B", type: "Clinic" },
  { name: "KwaNobuhle Clinic 2", subDistrict: "Sub-District B", type: "Clinic" },
  { name: "KwaNobuhle Clinic 3", subDistrict: "Sub-District B", type: "Clinic" },
  { name: "KwaNobuhle Clinic 4", subDistrict: "Sub-District B", type: "Clinic" },
  { name: "KwaNobuhle Clinic 8", subDistrict: "Sub-District B", type: "Clinic" },
  { name: "Town Clinic", subDistrict: "Sub-District B", type: "Clinic" },
  { name: "Gamble Clinic", subDistrict: "Sub-District B", type: "Clinic" },
  // Sub-District C
  { name: "Jose Pearson TB Hospital", subDistrict: "Sub-District C", type: "TB Hospital" },
  { name: "PE Central CHC", subDistrict: "Sub-District C", type: "CHC" },
  { name: "West End CHC", subDistrict: "Sub-District C", type: "CHC" },
  { name: "Walmer CHC", subDistrict: "Sub-District C", type: "CHC" },
  { name: "Central Clinic", subDistrict: "Sub-District C", type: "Clinic" },
  { name: "Walmer Clinic", subDistrict: "Sub-District C", type: "Clinic" },
  { name: "Gelvandale Clinic", subDistrict: "Sub-District C", type: "Clinic" },
  { name: "Helen Vale Clinic", subDistrict: "Sub-District C", type: "Clinic" },
  { name: "Korsten Clinic", subDistrict: "Sub-District C", type: "Clinic" },
  { name: "Algoa Park Clinic", subDistrict: "Sub-District C", type: "Clinic" },
  { name: "Chatty Clinic", subDistrict: "Sub-District C", type: "Clinic" },
  { name: "Booysen Park Clinic", subDistrict: "Sub-District C", type: "Clinic" },
  { name: "Bloemendal Clinic", subDistrict: "Sub-District C", type: "Clinic" },
  { name: "Schauderville Clinic", subDistrict: "Sub-District C", type: "Clinic" },
  { name: "Forest Hill Clinic", subDistrict: "Sub-District C", type: "Clinic" },
];

export const NMB_FACILITY_NAMES = new Set(NMB_FACILITIES.map((f) => f.name));
