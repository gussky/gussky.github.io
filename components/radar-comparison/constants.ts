export const FEATURES = [
  { key: "energy", label: "Energy" }, // Normalized to 800 kcal
  { key: "sugars", label: "Sugars" }, // Normalized to 50g
  { key: "saturatedFat", label: "Sat. Fat" }, // Normalized to 30g
  { key: "sodium", label: "Sodium" }, // Normalized to 2g
  { key: "fiber", label: "Fiber" }, // Normalized to 20g
  { key: "proteins", label: "Proteins" }, // Normalized to 40g
];

// Maximum values for normalization (based on high reference intakes)
export const MAX_VALS: Record<string, number> = {
  energy: 800, // kcal
  sugars: 50, // g (high sugar reference)
  saturatedFat: 30, // g (high fat reference)
  sodium: 2, // g (high sodium reference)
  fiber: 20, // g
  proteins: 40, // g
};
