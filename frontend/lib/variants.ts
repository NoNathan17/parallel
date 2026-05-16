export type VariantInfo = {
  name: string;
  shortLabel: string;
};

export const VARIANTS: VariantInfo[] = [
  { name: "Baseline", shortLabel: "Baseline" },
  { name: "Gender", shortLabel: "Gender" },
  { name: "Race & Ethnicity", shortLabel: "Race" },
  { name: "Socioeconomic Background", shortLabel: "Socio" },
];

const byName = Object.fromEntries(VARIANTS.map((v) => [v.name, v]));

export function getVariantInfo(name?: string): VariantInfo | undefined {
  if (!name) return undefined;
  return byName[name];
}