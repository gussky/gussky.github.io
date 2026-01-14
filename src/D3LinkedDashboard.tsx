import { useState, useMemo, useEffect } from "react";
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

// --- RECOMMENDER LOGIC ---
const scoreMap: Record<string, number> = { 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4 };

function findBetterAlternative(target: FoodPoint, allData: FoodPoint[]) {
  const currentScore = scoreMap[target.nutriscore.toLowerCase()] || 4;
  const isHealthy = currentScore <= 1 && target.nova !== '4';

  // If healthy, don't auto-recommend unless you want to show neighbors anyway
  if (isHealthy) return null;

  const candidates = allData.filter(p =>
      p !== target &&
      p.category === target.category &&
      p.nova !== '4' && p.nutriscore !== 'E' && p.nutriscore !== 'D' && // Hard rule: Must not be Nova 4
      (
          // CONDITION: Must be strictly better in at least one metric and not worse in the other
          (scoreMap[p.nutriscore.toLowerCase()] < scoreMap[target.nutriscore.toLowerCase()] && p.nova <= target.nova) ||
          (target.nova === '4' && p.nova < target.nova && scoreMap[p.nutriscore.toLowerCase()] <= scoreMap[target.nutriscore.toLowerCase()])
      )
  );

  if (candidates.length === 0) return null;

  // Find nearest neighbor in UMAP space
  let best = candidates[0];
  let minDist = Infinity;

  for (const p of candidates) {
    const dist = Math.sqrt(
        Math.pow(target.position[0] - p.position[0], 2) +
        Math.pow(target.position[1] - p.position[1], 2)
    );
    if (dist < minDist) {
      minDist = dist;
      best = p;
    }
  }
  return best;
}

const Legend = ({ title, items }: { title: string; items: { label: string; color: string }[] }) => (
    <div className="bg-white/90 backdrop-blur p-4 rounded-xl border border-gray-200 shadow-lg min-w-[140px]">
      <h4 className="font-bold text-gray-800 mb-3 text-xs uppercase tracking-widest border-b pb-2">{title}</h4>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full shadow-sm ring-1 ring-black/5" style={{ backgroundColor: item.color }} />
              <span className="text-gray-600 font-medium text-xs">{item.label}</span>
            </div>
        ))}
      </div>
    </div>
);

export default function LinkedD3Dashboard() {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [interactionMode, setInteractionMode] = useState<"select" | "zoom">("select");
  const [globalTransform, setGlobalTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; data: FoodPoint } | null>(null);

  // Popup State
  const [recommendation, setRecommendation] = useState<{
    type: 'switch' | 'keep',
    target: FoodPoint,
    better?: FoodPoint
  } | null>(null);

  // --- Handlers ---
  const handleClear = () => {
    setSelectedIndices(new Set());
    setRecommendation(null);
  };

  const handlePointClick = (point: FoodPoint) => {
    const better = findBetterAlternative(point, foodData);
    const pointIndex = foodData.indexOf(point);

    // Safety check in case indexOf fails
    if (pointIndex === -1) return;

    if (better) {
      const betterIndex = foodData.indexOf(better);
      setSelectedIndices(new Set([pointIndex, betterIndex]));
      setRecommendation({ type: 'switch', target: point, better });
    } else {
      setSelectedIndices(new Set([pointIndex]));
      setRecommendation({ type: 'keep', target: point });
    }
  };

  useEffect(() => {
    const handleScroll = () => { if (hoverInfo) setHoverInfo(null); };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hoverInfo]);

  // --- Helpers ---
  const { nutriLegend, novaLegend } = useMemo(() => {
    const nMap = new Map<string, string>();
    const vMap = new Map<string, string>();
    for (const d of foodData) {
      if (!nMap.has(d.nutriscore.toUpperCase())) nMap.set(d.nutriscore.toUpperCase(), `rgb(${d.ns_color.join(",")})`);
      if (!vMap.has(d.nova)) vMap.set(d.nova, `rgb(${d.nova_color.join(",")})`);
      if (nMap.size === 5 && vMap.size === 4) break;
    }
    return {
      nutriLegend: Array.from(nMap.entries()).sort().map(([l, c]) => ({ label: l, color: c })),
      novaLegend: Array.from(vMap.entries()).sort().map(([l, c]) => ({ label: l, color: c })),
    };
  }, []);
  // --- Stats Logic ---
  const stats = useMemo(() => {
    if (selectedIndices.size === 0) return null;
    const total = selectedIndices.size;
    let upfCount = 0;
    const catCounts: Record<string, number> = {};
    const nutriCounts: Record<string, number> = {};
    const novaCounts: Record<string, number> = {};

    selectedIndices.forEach((idx) => {
      const d = foodData[idx];
      if (!d) return; // Safety check

      if (d.nova === "4") upfCount++;
      catCounts[d.category] = (catCounts[d.category] || 0) + 1;
      nutriCounts[d.nutriscore.toUpperCase()] = (nutriCounts[d.nutriscore.toUpperCase()] || 0) + 1;
      novaCounts[d.nova] = (novaCounts[d.nova] || 0) + 1;
    });

    const getMode = (c: Record<string, number>) => Object.entries(c).sort((a,b) => b[1] - a[1])[0] || {key: '-', count: 0};
    return {
      total,
      topCategory: getMode(catCounts),
      topNutri: getMode(nutriCounts),
      topNova: getMode(novaCounts),
      ultraProcessedPct: Math.round((upfCount / total) * 100),
    };
  }, [selectedIndices]);

  const xFn = (d: FoodPoint) => d.position[0];
  const yFn = (d: FoodPoint) => d.position[1];
  const colorNutri = (d: FoodPoint) => `rgb(${d.ns_color.join(",")})`;
  const colorNova = (d: FoodPoint) => `rgb(${d.nova_color.join(",")})`;

  const handleHover = (d: any, x: number, y: number) => {
    if (!d) setHoverInfo(null);
    else setHoverInfo({ x, y, data: d });
  };

  return (
      <div className="w-full h-full flex flex-col bg-slate-50/50 font-sans text-gray-900 relative">
        {/* Header */}
        <div className="h-16 px-6 flex justify-between items-center border-b border-gray-200 bg-white/80 backdrop-blur sticky top-0 z-30">
          <div className="flex items-center gap-6 w-full">
            <div className="flex bg-gray-100 p-1 rounded-lg shrink-0">
              <button onClick={() => setInteractionMode("select")} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${interactionMode === "select" ? "bg-white shadow-sm text-blue-600" : "text-gray-500"}`}>Box Select</button>
              <button onClick={() => setInteractionMode("zoom")} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${interactionMode === "zoom" ? "bg-white shadow-sm text-blue-600" : "text-gray-500"}`}>Zoom</button>
            </div>

            {globalTransform !== d3.zoomIdentity && <button onClick={() => setGlobalTransform(d3.zoomIdentity)} className="hover:text-rose-500 text-xs border p-2 rounded">Reset axes</button>}
            {stats ? (
                <div className="flex gap-6 text-xs items-center border-l border-gray-200 pl-6 overflow-x-auto">
                  <div className="flex flex-col">
                    <span className="text-gray-400 font-bold uppercase text-[10px]">Most Common</span>
                    <span className="font-bold text-base whitespace-nowrap">{stats.topCategory[0]} <span className="text-gray-400 text-xs font-normal">({stats.topCategory[1]})</span></span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-400 font-bold uppercase text-[10px]">Typical Profile</span>
                    <span className="font-bold text-base whitespace-nowrap">Nutri <span className="text-blue-600">{stats.topNutri[0]}</span> / NOVA <span className="text-blue-600">{stats.topNova[0]}</span></span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-400 font-bold uppercase text-[10px]">Ultra-Processed</span>
                    <span className={`font-bold text-base ${stats.ultraProcessedPct > 50 ? "text-rose-500" : "text-emerald-500"}`}>{stats.ultraProcessedPct}%</span>
                  </div>
                </div>
            ) : (
                <div className="text-xs text-gray-400 italic pl-4 border-l border-gray-200">
                  Click a dot to check its health score
                </div>
            )}
          </div>
        </div>

        {/* Charts */}
        <div className="flex-grow flex p-6 gap-6 items-center justify-center relative overflow-hidden">
          <div className="relative bg-white rounded-2xl shadow-sm border border-gray-200 p-1 flex-1 h-full max-h-[600px] flex flex-col group">
            <div className="absolute bottom-4 right-4 z-10 pointer-events-none opacity-100">
              <Legend title="Nutri-Score" items={nutriLegend} />
            </div>
            {interactionMode === 'zoom' && <div className="absolute bottom-4 left-0 w-full text-center z-10 pointer-events-none"><span className="bg-white/80 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-gray-400 shadow-sm border border-gray-100">Double-click to reset view</span></div>}
            <div className="flex-grow relative rounded-xl overflow-hidden">
              <D3Scatter
                  data={foodData} xAccessor={xFn} yAccessor={yFn} colorAccessor={colorNutri}
                  selectedIndices={selectedIndices} onSelectionChange={setSelectedIndices}
                  onHoverChange={handleHover} onPointClick={handlePointClick}
                  interactionMode={interactionMode} zoomTransform={globalTransform} onZoomChange={setGlobalTransform}
                  width={600} height={550}
              />
            </div>
          </div>

          <div className="relative bg-white rounded-2xl shadow-sm border border-gray-200 p-1 flex-1 h-full max-h-[600px] flex flex-col group">
            <div className="absolute bottom-4 right-4 z-10 pointer-events-none opacity-100">
              <Legend title="NOVA Group" items={novaLegend} />
            </div>
            {interactionMode === 'zoom' && <div className="absolute bottom-4 left-0 w-full text-center z-10 pointer-events-none"><span className="bg-white/80 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-gray-400 shadow-sm border border-gray-100">Double-click to reset view</span></div>}
            <div className="flex-grow relative rounded-xl overflow-hidden">
              <D3Scatter
                  data={foodData} xAccessor={xFn} yAccessor={yFn} colorAccessor={colorNova}
                  selectedIndices={selectedIndices} onSelectionChange={setSelectedIndices}
                  onHoverChange={handleHover} onPointClick={handlePointClick}
                  interactionMode={interactionMode} zoomTransform={globalTransform} onZoomChange={setGlobalTransform}
                  width={600} height={550}
              />
            </div>
          </div>
        </div>

        {/* --- POPUP --- */}
        {recommendation && (
            <div className="fixed inset-0 bg-transparent z-50" onClick={handleClear}>
              <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
                <div className="bg-white rounded-2xl shadow-2xl border border-white/40 p-6 max-w-md w-[400px] relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -z-10 opacity-20 ${recommendation.type === 'keep' ? 'bg-green-400' : 'bg-blue-400'}`} />

                  <div className="flex justify-between items-start mb-4">
                    <h3 className={`text-xl font-bold ${recommendation.type === 'keep' ? 'text-green-600' : 'text-gray-800'}`}>
                      {recommendation.type === 'keep' ? 'Excellent Choice! 🌟' : 'Better Choice Found'}
                    </h3>
                    <button onClick={handleClear} className="text-gray-400 hover:text-gray-600">✕</button>
                  </div>

                  {recommendation.type === 'keep' ? (
                      <div className="text-center py-4">
                        <div className="text-4xl mb-3">🥗</div>
                        <div className="font-bold text-gray-900 text-lg leading-tight">{recommendation.target.name}</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">{recommendation.target.brand}</div>

                        <p className="text-gray-500 text-sm mb-4 mt-2">
                          This product is already one of the healthiest options in the <strong>{recommendation.target.category}</strong> category.
                        </p>
                        <div className="flex justify-center gap-3 text-xs font-bold">
                          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">Grade {recommendation.target.nutriscore.toUpperCase()}</span>
                          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">NOVA {recommendation.target.nova}</span>
                        </div>
                      </div>
                  ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 opacity-60">
                          <div className="text-[10px] uppercase font-bold text-red-500 mb-1">Current</div>
                          <div className="font-bold text-sm leading-tight mb-1 h-9 overflow-hidden">{recommendation.target.name}</div>
                          <div className="text-[10px] text-gray-500 mb-2 truncate">{recommendation.target.brand}</div>
                          <div className="flex gap-1 text-[10px]">
                            <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Grade {recommendation.target.nutriscore.toUpperCase()}</span>
                            <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded">N{recommendation.target.nova}</span>
                          </div>
                        </div>

                        <div className="text-gray-300 text-xl font-light">➔</div>

                        <div className="flex-1 p-3 bg-green-50 rounded-lg border border-green-100">
                          <div className="text-[10px] uppercase font-bold text-green-600 mb-1">Switch To</div>
                          <div className="font-bold text-sm leading-tight text-green-900 mb-1 h-9 overflow-hidden">{recommendation.better!.name}</div>
                          <div className="text-[10px] text-green-700/60 mb-2 truncate">{recommendation.better!.brand}</div>
                          <div className="flex gap-1 text-[10px]">
                            <span className="bg-green-200 text-green-800 px-1.5 py-0.5 rounded">Grade {recommendation.better!.nutriscore.toUpperCase()}</span>
                            <span className="bg-green-200 text-green-800 px-1.5 py-0.5 rounded">N{recommendation.better!.nova}</span>
                          </div>
                        </div>
                      </div>
                  )}
                </div>
              </div>
            </div>
        )}

        {/* Hover Tooltip */}
        {hoverInfo && !recommendation && (
            <div className="fixed z-50 bg-white/95 backdrop-blur p-4 rounded-lg shadow-2xl border border-gray-100 pointer-events-none text-sm max-w-[240px]" style={{ left: hoverInfo.x + 20, top: hoverInfo.y + 20 }}>
              <div className="font-bold text-gray-900 text-base mb-1 truncate">{hoverInfo.data.name}</div>
              <div className="text-gray-500 text-xs uppercase tracking-wide border-b border-gray-100 pb-2 mb-2 truncate">{hoverInfo.data.brand}</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <span className="text-gray-500">Nutri: <b className="text-gray-900">{hoverInfo.data.nutriscore.toUpperCase()}</b></span>
                <span className="text-gray-500">NOVA: <b className="text-gray-900">{hoverInfo.data.nova}</b></span>
              </div>
            </div>
        )}
      </div>
  );
}

