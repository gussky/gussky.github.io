import { useState, useEffect } from "react";
import "./RadarComparison.css";

import type { Product } from "./radar-comparison/types";
import { createChartData } from "./radar-comparison/utils";
import { useProductData } from "./radar-comparison/useProductData";

import Stage1Butterfly from "./radar-comparison/Stage1Butterfly";
import Stage2Reveal from "./radar-comparison/Stage2Reveal";
import Stage3Interactive from "./radar-comparison/Stage3Interactive";

export default function RadarComparison() {
  const { products, loading, defaultSelection1, defaultSelection2 } =
    useProductData();

  const [selection1, setSelection1] = useState<Product | null>(null);
  const [selection2, setSelection2] = useState<Product | null>(null);

  // Initialize selection when data is ready
  useEffect(() => {
    if (defaultSelection1 && defaultSelection2) {
      setSelection1(defaultSelection1);
      setSelection2(defaultSelection2);
    }
  }, [defaultSelection1, defaultSelection2]);

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
