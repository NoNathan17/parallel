export type VariantInfo = {
  name: string;
};

export const VARIANTS: VariantInfo[] = [
  { name: "Baseline" },
  { name: "Gender" },
  { name: "Race & Ethnicity" },
  { name: "Socioeconomic Background" },
];

const byName = Object.fromEntries(VARIANTS.map((v) => [v.name, v]));

export function getVariantInfo(name?: string): VariantInfo | undefined {
  if (!name) return undefined;
  return byName[name];
}