import { useState } from "react";
import type { Product } from "./types";

interface ProductSelectorProps {
  label: string;
  color: string;
  allProducts: Product[];
  selection: Product;
  setSelection: (p: Product) => void;
  getNutriScoreColor: (score: string) => string;
  isRevealed: boolean;
}

const ProductSelector = ({
  label,
  color,
  allProducts,
  selection,
  setSelection,
  getNutriScoreColor,
  isRevealed,
}: ProductSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState<string>("");

  if (!isRevealed) {
    return (
      <div className="product-selector-locked">
        <span>Controls locked until reveal</span>
      </div>
    );
  }

  // --- Filtering Logic ---
  let filteredProducts = allProducts;

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredProducts = filteredProducts.filter((p) =>
      p.name.toLowerCase().includes(term)
    );
  }

  const displayProducts = filteredProducts.slice(0, 1500);
  // Group by main category for the dropdown
  const groupedDisplay: Record<string, Product[]> = {};
  displayProducts.forEach((p) => {
    if (!groupedDisplay[p.mainCategory]) groupedDisplay[p.mainCategory] = [];
    groupedDisplay[p.mainCategory].push(p);
  });

  return (
    <div className="product-selector-container compact">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span className="selector-header-label">{label}</span>
      </div>

      {/* 1. Filter Row (Search Only) */}
      <div className="selector-row">
        <div className="selector-col">
          <label className="selector-label">Search Product</label>
          <input
            className="selector-input"
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 2. Product Select */}
      <div className="selector-row">
        <div className="selector-col">
          <label className="selector-label">Select Product</label>
          <select
            className="selector-select main-select"
            style={{
              borderColor: !searchTerm ? "#e5e7eb" : color,
            }}
            value={selection.id}
            onChange={(e) => {
              const found = allProducts.find((p) => p.id === e.target.value);
              if (found) setSelection(found);
            }}
            disabled={false}
          >
            <option disabled value="">
              Select a product...
            </option>

            {Object.entries(groupedDisplay).map(([cat, items]) => (
              <optgroup key={cat} label={cat}>
                {items.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} [{p.nutriscore}]
                  </option>
                ))}
              </optgroup>
            ))}

            {filteredProducts.length === 0 && (
              <option disabled>No matches</option>
            )}
          </select>
        </div>
      </div>

      <div className="selector-info-row">
        {/* Grade */}
        <div className="info-group" style={{ width: "100%" }}>
          <span className="info-label">Nutri-Score Grade</span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              marginTop: "0.25rem",
            }}
          >
            <span
              className="ns-badge"
              style={{
                backgroundColor: isRevealed
                  ? getNutriScoreColor(selection.nutriscore)
                  : "#ccc",
                width: "48px",
                height: "48px",
                fontSize: "1.25rem",
              }}
            >
              {selection.nutriscore}
            </span>
            <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
              {isRevealed ? "Revealed" : "Hidden"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductSelector;
