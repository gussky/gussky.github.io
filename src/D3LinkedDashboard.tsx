import { useState, useMemo } from "react";
import * as d3 from "d3";
import D3Scatter from "./D3Scatter";
import foodDataRaw from "./assets/food_umap.json";

// --- Types ---
interface FoodPoint {
  position: [number, number];
  name: string;
  brand: string;
  category: string;
  ns_color: [number, number, number];
  nova_color: [number, number, number];
  nutriscore: string;
  nova: string;
}
const foodData = foodDataRaw as unknown as FoodPoint[];

// --- LEGEND COMPONENT ---
const Legend = ({
  title,
  items,
}: {
  title: string;
  items: { label: string; color: string }[];
}) => (
  <div className="bg-white/90 backdrop-blur p-4 rounded-xl border border-gray-200 shadow-lg min-w-[140px]">
    <h4 className="font-bold text-gray-800 mb-3 text-xs uppercase tracking-widest border-b pb-2">
      {title}
    </h4>
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2.5">
          <span
            className="w-3 h-3 rounded-full shadow-sm ring-1 ring-black/5"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-gray-600 font-medium text-xs">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export default function LinkedD3Dashboard() {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set()
  );
  const [interactionMode, setInteractionMode] = useState<"select" | "zoom">(
    "select"
  );
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    data: FoodPoint;
  } | null>(null);
  const [globalTransform, setGlobalTransform] = useState<d3.ZoomTransform>(
    d3.zoomIdentity
  );

  // --- LEGEND DATA PREP ---
  // Scan data once to find the color for each category
  const { nutriLegend, novaLegend } = useMemo(() => {
    const nMap = new Map<string, string>();
    const vMap = new Map<string, string>();

    // Find first occurrence of each grade to grab its color
    for (const d of foodData) {
      const nLabel = d.nutriscore.toUpperCase();
      const vLabel = d.nova;

      if (!nMap.has(nLabel)) nMap.set(nLabel, `rgb(${d.ns_color.join(",")})`);
      if (!vMap.has(vLabel)) vMap.set(vLabel, `rgb(${d.nova_color.join(",")})`);

      // Optimization: Stop if we found all (5 Nutri, 4 Nova)
      if (nMap.size === 5 && vMap.size === 4) break;
    }

    return {
      nutriLegend: Array.from(nMap.entries())
        .sort()
        .map(([l, c]) => ({ label: l, color: c })),
      novaLegend: Array.from(vMap.entries())
        .sort()
        .map(([l, c]) => ({ label: l, color: c })),
    };
  }, []);

  // --- STATS LOGIC ---
  const stats = useMemo(() => {
    if (selectedIndices.size === 0) return null;
    const total = selectedIndices.size;
    let upfCount = 0;
    const catCounts: Record<string, number> = {};
    let maxCat = "";
    let maxCount = 0;

    selectedIndices.forEach((idx) => {
      const d = foodData[idx];
      if (d.nova === "4") upfCount++;
      catCounts[d.category] = (catCounts[d.category] || 0) + 1;
      if (catCounts[d.category] > maxCount) {
        maxCount = catCounts[d.category];
        maxCat = d.category;
      }
    });

    return {
      total,
      topCategory: maxCat,
      topCategoryCount: maxCount,
      ultraProcessedPct: Math.round((upfCount / total) * 100),
    };
  }, [selectedIndices]);

  // Accessors
  const xFn = (d: FoodPoint) => d.position[0];
  const yFn = (d: FoodPoint) => d.position[1];
  const colorNutri = (d: FoodPoint) => `rgb(${d.ns_color.join(",")})`;
  const colorNova = (d: FoodPoint) => `rgb(${d.nova_color.join(",")})`;

  const handleHover = (d: any, x: number, y: number) => {
    if (!d) setHoverInfo(null);
    else setHoverInfo({ x, y, data: d });
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50/50 font-sans text-gray-900">
      {/* Header / Controls */}
      <div className="h-16 px-6 flex justify-between items-center border-b border-gray-200 bg-white/80 backdrop-blur sticky top-0 z-30">
        <div className="flex items-center gap-6">
          {/* Tool Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setInteractionMode("select")}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                interactionMode === "select"
                  ? "bg-white shadow-sm text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Box Select
            </button>
            <button
              onClick={() => setInteractionMode("zoom")}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                interactionMode === "zoom"
                  ? "bg-white shadow-sm text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Zoom
            </button>
          </div>

          {/* Inline Stats */}
          {stats && (
            <div className="flex gap-6 text-xs items-center border-l border-gray-200 pl-6">
              <div className="flex flex-col">
                <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                  Count
                </span>
                <span className="font-bold text-base leading-none">
                  {stats.total}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                  Top Cat
                </span>
                <span className="font-bold text-base leading-none">
                  {stats.topCategory}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                  Ultra-Processed
                </span>
                <span
                  className={`font-bold text-base leading-none ${
                    stats.ultraProcessedPct > 50
                      ? "text-rose-500"
                      : "text-emerald-500"
                  }`}
                >
                  {stats.ultraProcessedPct}%
                </span>
              </div>
              <button
                onClick={() => setSelectedIndices(new Set())}
                className="ml-2 text-gray-400 hover:text-rose-500 underline decoration-dotted underline-offset-4 text-xs"
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Charts Area */}
      <div className="flex-grow flex p-6 gap-6 items-center justify-center relative overflow-hidden">
        {/* Chart 1 Container */}
        <div className="relative bg-white rounded-2xl shadow-sm border border-gray-200 p-1 flex-1 h-full max-h-[600px] flex flex-col">
          <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
            <Legend title="Nutri-Score" items={nutriLegend} />
          </div>
          <div className="flex-grow relative rounded-xl overflow-hidden">
            <D3Scatter
              data={foodData}
              xAccessor={xFn}
              yAccessor={yFn}
              colorAccessor={colorNutri}
              selectedIndices={selectedIndices}
              onSelectionChange={setSelectedIndices}
              onHoverChange={handleHover}
              interactionMode={interactionMode}
              zoomTransform={globalTransform}
              onZoomChange={setGlobalTransform}
              width={600}
              height={550} // Adjust sizes as needed or make responsive
            />
          </div>
        </div>

        {/* Chart 2 Container */}
        <div className="relative bg-white rounded-2xl shadow-sm border border-gray-200 p-1 flex-1 h-full max-h-[600px] flex flex-col">
          <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
            <Legend title="NOVA Group" items={novaLegend} />
          </div>
          <div className="flex-grow relative rounded-xl overflow-hidden">
            <D3Scatter
              data={foodData}
              xAccessor={xFn}
              yAccessor={yFn}
              colorAccessor={colorNova}
              selectedIndices={selectedIndices}
              onSelectionChange={setSelectedIndices}
              onHoverChange={handleHover}
              interactionMode={interactionMode}
              zoomTransform={globalTransform}
              onZoomChange={setGlobalTransform}
              width={600}
              height={550}
            />
          </div>
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoverInfo && (
        <div
          className="fixed z-50 bg-white/95 backdrop-blur p-4 rounded-lg shadow-2xl border border-gray-100 pointer-events-none text-sm min-w-[200px]"
          style={{ left: hoverInfo.x + 20, top: hoverInfo.y + 20 }}
        >
          <div className="font-bold text-gray-900 text-base mb-1">
            {hoverInfo.data.name}
          </div>
          <div className="text-gray-500 text-xs uppercase tracking-wide border-b border-gray-100 pb-2 mb-2">
            {hoverInfo.data.brand}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <span className="text-gray-500">
              Nutri-Score:{" "}
              <b className="text-gray-900">
                {hoverInfo.data.nutriscore.toUpperCase()}
              </b>
            </span>
            <span className="text-gray-500">
              NOVA: <b className="text-gray-900">{hoverInfo.data.nova}</b>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
