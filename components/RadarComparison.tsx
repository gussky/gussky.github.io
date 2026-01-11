import { useState, useEffect } from "react";
import Papa from "papaparse";
import "./RadarComparison.css";

import type { Product, RawProduct } from "./radar-comparison/types";
import { FEATURES } from "./radar-comparison/constants";
import { createChartData } from "./radar-comparison/utils";

import Stage1Butterfly from "./radar-comparison/Stage1Butterfly";
import Stage2Reveal from "./radar-comparison/Stage2Reveal";
import Stage3Interactive from "./radar-comparison/Stage3Interactive";

export default function RadarComparison() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selection1, setSelection1] = useState<Product | null>(null);
  const [selection2, setSelection2] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [defaultSelection1, setDefaultSelection1] = useState<Product | null>(
    null
  );
  const [defaultSelection2, setDefaultSelection2] = useState<Product | null>(
    null
  );

  useEffect(() => {
    Papa.parse<RawProduct>("/cleaned_interm_food_facts.csv", {
      download: true,
      header: true,
      skipEmptyLines: true,
      error: (err, file) => {
        console.error("Papa Parse Error:", err, file);
        setLoading(false);
      },
      complete: (results) => {
        const rawData = results.data as RawProduct[];

        const validProducts = rawData
          .map((row) => {
            const stats = {
              energy: 0,
              sugars: 0,
              saturatedFat: 0,
              sodium: 0,
              fiber: 0,
              proteins: 0,
            };

            FEATURES.forEach((f) => {
              // Handle potential missing keys gracefully
              const val = parseFloat(
                // @ts-expect-error - dynamic access
                row[f.key] ||
                  // @ts-expect-error - dynamic access
                  row[f.key.replace("saturatedFat", "saturated-fat_100g")]
              );

              let csvKey = "";
              if (f.key === "energy") csvKey = "energy-kcal_100g";
              else if (f.key === "saturatedFat") csvKey = "saturated-fat_100g";
              else csvKey = `${f.key}_100g`;

              // @ts-expect-error - dynamic access
              const parsed = parseFloat(row[csvKey]);
              // @ts-expect-error - dynamic key assignment on typed object
              stats[f.key] = isNaN(parsed) ? 0 : parsed;
            });

            // Parse Categories
            const rawCatsString =
              // @ts-expect-error - dynamic access
              row.categories ||
              row.pnns_groups_1 ||
              // @ts-expect-error - dynamic access
              row.pnns_groups_2 ||
              "Misc";
            const rawCats = rawCatsString.split(",");
            const cleanCats = rawCats
              .map((c: string) => c.trim())
              .filter(Boolean);

            const mainCategory = "Snacks";

            return {
              // @ts-expect-error - dynamic access
              id: row.code || Math.random().toString(),
              name: row.product_name || "Unknown Product",
              mainCategory,
              categories: cleanCats,
              nutriscore: (row.nutriscore_grade || "E").toUpperCase(),
              qualityScore: 0,
              stats,
            };
          })
          .filter((p: Product) => p.name !== "Unknown Product");

        // Use a Map to filter duplicates by name
        const uniqueProductsMap = new Map();
        validProducts.forEach((p: Product) => {
          if (!uniqueProductsMap.has(p.name)) {
            uniqueProductsMap.set(p.name, p);
          }
        });
        const uniqueProducts = Array.from(
          uniqueProductsMap.values()
        ) as Product[];

        // Limit to top N items PER category, balanced by Nutri-Score
        const itemsPerCategory = 1000;
        const productsByCategory: Record<string, Product[]> = {};

        // 1. Group by Main Category
        for (const p of uniqueProducts) {
          if (!productsByCategory[p.mainCategory]) {
            productsByCategory[p.mainCategory] = [];
          }
          productsByCategory[p.mainCategory].push(p);
        }

        const relevantProducts: Product[] = [];

        // 2. For each category, balance by Nutri-Score
        Object.entries(productsByCategory).forEach(([_, catProducts]) => {
          const byGrade: Record<string, Product[]> = {
            A: [],
            B: [],
            C: [],
            D: [],
            E: [],
            UNKNOWN: [],
          };

          catProducts.forEach((p) => {
            const g = p.nutriscore || "UNKNOWN";
            if (byGrade[g]) byGrade[g].push(p);
            else byGrade["UNKNOWN"].push(p);
          });

          // Target per grade
          const targetPerGrade = Math.ceil(itemsPerCategory / 5);

          const selectedForCat: Product[] = [];

          // Collect evenly
          (["A", "B", "C", "D", "E"] as const).forEach((grade) => {
            selectedForCat.push(...byGrade[grade].slice(0, targetPerGrade));
          });

          // Fill remainder
          if (selectedForCat.length < itemsPerCategory) {
            const remainingSlots = itemsPerCategory - selectedForCat.length;
            const usedIds = new Set(selectedForCat.map((p) => p.id));
            const leftovers = catProducts.filter((p) => !usedIds.has(p.id));
            leftovers.sort((a, b) => a.nutriscore.localeCompare(b.nutriscore));
            selectedForCat.push(...leftovers.slice(0, remainingSlots));
          }

          relevantProducts.push(...selectedForCat);
        });

        // Anomaly Override
        const anomaly1Name = "Extra Crunchy";
        const anomaly2Name = "Natural Peanut Butter Spread extra crunchy";

        const findProduct = (name: string) =>
          uniqueProducts.find((p) => p.name === name) ||
          uniqueProducts.find(
            (p) => p.name.toLowerCase() === name.toLowerCase()
          );

        const anomaly1 = findProduct(anomaly1Name);
        const anomaly2 = findProduct(anomaly2Name);

        if (anomaly1 && !relevantProducts.some((p) => p.id === anomaly1.id)) {
          relevantProducts.push(anomaly1);
        }
        if (anomaly2 && !relevantProducts.some((p) => p.id === anomaly2.id)) {
          relevantProducts.push(anomaly2);
        }

        relevantProducts.sort((a, b) => {
          if (a.mainCategory < b.mainCategory) return -1;
          if (a.mainCategory > b.mainCategory) return 1;
          if (a.nutriscore < b.nutriscore) return -1;
          if (a.nutriscore > b.nutriscore) return 1;
          return a.name.localeCompare(b.name);
        });

        setProducts(relevantProducts);

        // INIT STATE
        if (anomaly1 && anomaly2) {
          setSelection1(anomaly1);
          setSelection2(anomaly2);
          setDefaultSelection1(anomaly1);
          setDefaultSelection2(anomaly2);
        } else if (relevantProducts.length >= 2) {
          setSelection1(relevantProducts[0]);
          setSelection2(relevantProducts[1]);
          setDefaultSelection1(relevantProducts[0]);
          setDefaultSelection2(relevantProducts[1]);
        }
        setLoading(false);
      },
    });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "2.5rem", textAlign: "center", color: "#333" }}>
        Loading data...
      </div>
    );
  }

  if (!selection1 || !selection2 || !defaultSelection1 || !defaultSelection2) {
    return (
      <div style={{ padding: "2.5rem", textAlign: "center", color: "#333" }}>
        Insufficient data found.
      </div>
    );
  }

  // Calculate Chart Data
  const chartDataDefault = createChartData(
    defaultSelection1,
    defaultSelection2,
    false
  );

  const chartDataInteractive = createChartData(selection1, selection2, true);

  return (
    <div className="scrolly-container">
      <div className="sticky-wrapper">
        <div className="center-content-wrapper">
          {/* Stage 1: Butterfly Chart */}
          <Stage1Butterfly
            product1={defaultSelection1}
            product2={defaultSelection2}
            chartData={chartDataDefault}
          />

          {/* Stage 2: The Plot Twist */}
          <Stage2Reveal
            product1={defaultSelection1}
            product2={defaultSelection2}
          />

          {/* Stage 3: Interactive Radar */}
          <Stage3Interactive
            products={products}
            selection1={selection1}
            selection2={selection2}
            setSelection1={setSelection1}
            setSelection2={setSelection2}
            chartData={chartDataInteractive}
          />
        </div>
      </div>
    </div>
  );
}
