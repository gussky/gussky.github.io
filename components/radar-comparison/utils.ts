import type { Product } from "./types";
import { FEATURES, MAX_VALS } from "./constants";

export const getNutriScoreColor = (score: string) => {
  switch (score) {
    case "A":
      return "#166534"; // dark green
    case "B":
      return "#22c55e"; // green
    case "C":
      return "#eab308"; // yellow
    case "D":
      return "#f97316"; // orange
    case "E":
      return "#ef4444"; // red
    default:
      return "#d1d5db"; // gray
  }
};

export const createChartData = (
  s1: Product | null,
  s2: Product | null,
  useDynamicScale: boolean
) => {
  if (!s1 || !s2) return [];

  return FEATURES.map((feature) => {
    // @ts-expect-error - dynamic key access
    const val1 = s1.stats[feature.key];
    // @ts-expect-error - dynamic key access
    const val2 = s2.stats[feature.key];

    let max = 100;

    if (useDynamicScale) {
      // Dynamic normalization: scale based on the largest of the two values
      max = Math.max(val1, val2) * 1.2;
      if (max < 5) max = 10;
    } else {
      // Fixed normalization (State 1)
      max = MAX_VALS[feature.key] || 100;
    }

    return {
      subject: feature.label,
      val1Normalized: Math.min((val1 / max) * 100, 100),
      val2Normalized: Math.min((val2 / max) * 100, 100),
      val1Real: val1,
      val2Real: val2,
      fullMark: 100,
    };
  });
};
