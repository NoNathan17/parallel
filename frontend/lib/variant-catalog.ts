import { VARIANT_LANE_COLORS } from "@/lib/types";

export type VariantCatalogEntry = {
  id: string;
  title: string;
  shortLabel: string;
  color: string;
  signal: string;
  why: string;
  whatChanges: string;
};

export const VARIANT_CATALOG: VariantCatalogEntry[] = [
  {
    id: "baseline",
    title: "Baseline",
    shortLabel: "A",
    color: VARIANT_LANE_COLORS.baseline,
    signal:
      "Reference profile with dominant-norm hiring signals; traditional path and strong network",
    why: "Represents the hiring system's default 'sacred timeline' — elite-path cues, referral, and conventional polish.",
    whatChanges:
      "Same skills and projects; identity and network signals align with majority tech hiring heuristics.",
  },
  {
    id: "gender",
    title: "Gender",
    shortLabel: "B",
    color: VARIANT_LANE_COLORS.gender,
    signal:
      "Equivalent qualifications; gender-associated name and affiliation signals",
    why: "Tests whether gendered cues (name, affiliations) shift subjective 'fit' without changing technical parity.",
    whatChanges:
      "Identical experience; contextual signals may trigger gender stereotypes in culture-fit language.",
  },
  {
    id: "race",
    title: "Race & Ethnicity",
    shortLabel: "C",
    color: VARIANT_LANE_COLORS.race,
    signal:
      "Equivalent qualifications; racial/ethnic identity signals (name, community, school context)",
    why: "Surfaces pedigree proxies and identity signaling when technical strength is held constant.",
    whatChanges:
      "Same projects and tenure; school and community context may invoke racial bias at screen and recruiter stages.",
  },
  {
    id: "socioeconomic",
    title: "Socioeconomic Background",
    shortLabel: "D",
    color: VARIANT_LANE_COLORS.socioeconomic,
    signal:
      "Equivalent qualifications; first-generation and low-network socioeconomic signals",
    why: "Highlights class-coded assumptions (university tier, network, polish) that are not skills gaps.",
    whatChanges:
      "Equivalent skills; first-gen and regional public university cues may reduce perceived 'pedigree'.",
  },
];

export function catalogEntryForId(id: string): VariantCatalogEntry | undefined {
  return VARIANT_CATALOG.find((v) => v.id === id);
}
