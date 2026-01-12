export interface Product {
  id: string;
  name: string;
  mainCategory: string; // Used for grouping and primary filtering
  categories: string[]; // Full list of categories for display
  nutriscore: string;
  qualityScore: number;
  stats: {
    energy: number;
    sugars: number;
    saturatedFat: number;
    sodium: number;
    fiber: number;
    proteins: number;
  };
}

export interface RawProduct {
  product_name: string;
  brands: string;
  image_url: string;
  nutriscore_grade: string;
  "energy-kcal_100g": string;
  sugars_100g: string;
  "saturated-fat_100g": string;
  sodium_100g: string;
  fiber_100g: string;
  proteins_100g: string;
  pnns_groups_1: string;
}
