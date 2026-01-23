import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  Beaker, 
  X, 
  Grid, 
  Share2,
  RefreshCcw,
  ShoppingBag,
  Eye,
  Search,
  FlaskConical,
  BarChart3,
  Store,
  ChevronDown,
  MousePointer2
} from 'lucide-react';

// --- VISUAL CONFIGURATION ---

// THEME kept for potential future use
// const THEME = {
//     bg: "#F8FAFC", 
//     panelBg: "rgba(255, 255, 255, 0.95)",
//     textMain: "#0F172A", 
//     textMuted: "#64748B", 
//     border: "#E2E8F0", 
//     accent: "#0EA5E9",
//     riskHigh: "#EF4444",
//     riskMed: "#F59E0B",
//     riskLow: "#10B981"
// };

const CLUSTERS = {
  GENERAL: { id: 'general', label: "Preservatives", color: "#22c55e", x: 0.5, y: -0.5 }, // Q1: Upper Right
  MEAT: { id: 'meat', label: "Meat Processors", color: "#ef4444", x: -0.5, y: -0.5 }, // Q2: Upper Left
  TEXTURE: { id: 'texture', label: "Texture/Fillers", color: "#f59e0b", x: -0.5, y: 0.5 }, // Q3: Lower Left
  COLORS: { id: 'colors', label: "Colors", color: "#a855f7", x: 0, y: 0 }, // Center
  SWEETENERS: { id: 'sweeteners', label: "Sweeteners", color: "#3b82f6", x: 0.5, y: 0.5 } // Q4: Lower Right
};

const GRADE_ZONES = {
    A: { x: -400, color: "#166534", label: "Grade A" },
    B: { x: -200, color: "#65a30d", label: "Grade B" },
    C: { x: 0,    color: "#ca8a04", label: "Grade C" },
    D: { x: 200,  color: "#ea580c", label: "Grade D" },
    E: { x: 400,  color: "#dc2626", label: "Grade E" }
};

const NUTRI_COLORS = {
  A: "#16a34a", 
  B: "#84cc16", 
  C: "#eab308", 
  D: "#f97316", 
  E: "#ef4444"  
};

// Helper to generate boxPlotData from nutriScoreDist and score (kept for potential future use)
// const generateBoxPlotData = (_nutriScoreDist: number[], score: string) => {
//   const scoreMap: Record<string, number> = { A: -5, B: 0, C: 5, D: 20, E: 25 };
//   const baseScore = scoreMap[score] || 5;
//   
//   return [1, 2, 3, 4].map(nova => {
//     let base = baseScore + (nova - 1) * 7; 
//     const median = Math.min(40, Math.max(-15, base + (Math.random() * 10 - 5)));
//     const spread = 5 + Math.random() * 5;
//     
//     return {
//       nova,
//       median,
//       q1: Math.max(-15, median - spread/2),
//       q3: Math.min(40, median + spread/2),
//       min: Math.max(-15, median - spread),
//       max: Math.min(40, median + spread)
//     };
//   });
// };

// --- SUB-COMPONENTS ---

// 1. Distribution Predictor - Improved styling
// actualData is the REAL grade distribution from the dataset: [A%, B%, C%, D%, E%]
const DistributionPredictor = ({ actualData }: { actualData: number[] }) => {
    const [userPoints, setUserPoints] = useState(new Array(5).fill(0.2));
    const [isRevealed, setIsRevealed] = useState(false);
    const [lastPos, setLastPos] = useState<[number, number] | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        setUserPoints(new Array(5).fill(0.2));
        setIsRevealed(false); 
        setLastPos(null);
    }, [actualData]);

    const handleDraw = (e: React.PointerEvent) => {
        if (isRevealed || !svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - 30; 
        const y = e.clientY - rect.top;
        const width = rect.width - 30;
        const height = rect.height - 20; 
        
        if (x < 0) return; 

        const currIndexRaw = (x / width) * 5; 
        const currIndex = Math.max(0, Math.min(4, Math.floor(currIndexRaw)));
        const currValue = 1 - Math.max(0, Math.min(1, y / height));

        setUserPoints(prev => {
            const next = [...prev];
            if (lastPos !== null) {
                const [lastIdx, lastVal] = lastPos;
                const dist = Math.abs(currIndex - lastIdx);
                const step = currIndex > lastIdx ? 1 : -1;
                for (let i = 0; i <= dist; i++) {
                    const idx = lastIdx + (i * step);
                    if(idx >=0 && idx < 5) {
                        const t = i / Math.max(1, dist);
                        next[idx] = lastVal + (currValue - lastVal) * t;
                    }
                }
            } else {
                next[currIndex] = currValue;
            }
            return next;
        });
        setLastPos([currIndex, currValue]);
    };

    const handleUp = () => setLastPos(null);

    const stats = useMemo(() => {
        if (!isRevealed) return null;
        let totalError = 0;
        for(let i=0; i<5; i++) {
            totalError += Math.abs(userPoints[i] - actualData[i]);
        }
        const accuracy = Math.max(0, 1 - (totalError / 2.5));
        return { accuracy: Math.round(accuracy * 100) };
    }, [isRevealed, userPoints, actualData]);

    const generatePath = d3.line<number>()
        .x((_d, i) => (i * 20) + 10) 
        .y(d => (1 - d) * 100)
        .curve(d3.curveMonotoneX);

    return (
        <div style={{
            backgroundColor: 'rgba(248, 250, 252, 0.8)',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BarChart3 size={14} style={{ color: '#0ea5e9' }}/> Guess Grade Distribution
                    <span style={{ fontSize: '9px', fontWeight: 'normal', color: '#94a3b8', fontStyle: 'italic' }}>(from dataset)</span>
                </span>
                <button 
                    onClick={() => setIsRevealed(!isRevealed)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        ...(isRevealed ? {
                            color: '#475569',
                            backgroundColor: '#f1f5f9',
                            borderColor: '#cbd5e1'
                        } : {
                            color: '#0ea5e9',
                            backgroundColor: '#e0f2fe',
                            borderColor: '#bae6fd'
                        })
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                >
                    {isRevealed ? <><RefreshCcw size={12} /> Reset</> : <><Eye size={12} /> Reveal</>}
                </button>
            </div>

            <div style={{ display: 'flex' }}>
                <div style={{ width: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '9px', color: '#94a3b8', fontFamily: 'monospace', textAlign: 'right', paddingRight: '4px', height: '140px', paddingTop: '2px', paddingBottom: '2px' }}>
                    <span>100%</span>
                    <span>75%</span>
                    <span>50%</span>
                    <span>25%</span>
                    <span>0%</span>
                </div>

                <div 
                    style={{
                        position: 'relative',
                        flex: 1,
                        height: '140px',
                        border: '1px dashed',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        transition: 'all 0.3s',
                        ...(!isRevealed ? {
                            cursor: 'crosshair',
                            borderColor: '#fbbf24',
                            backgroundColor: 'rgba(254, 243, 199, 0.3)'
                        } : {
                            borderColor: '#cbd5e1',
                            backgroundColor: 'rgba(248, 250, 252, 0.2)'
                        })
                    }}
                    onPointerDown={(e) => { if (!isRevealed && svgRef.current) { e.currentTarget.setPointerCapture(e.pointerId); handleDraw(e); }}}
                    onPointerMove={(e) => { if (!isRevealed && e.buttons === 1) handleDraw(e); }}
                    onPointerUp={handleUp}
                >
                    <svg ref={svgRef} style={{ width: '100%', height: '100%' }} viewBox="0 0 100 100" preserveAspectRatio="none">
                        {[0, 25, 50, 75, 100].map(y => (
                            <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#e2e8f0" strokeWidth="0.5" />
                        ))}
                        {[20, 40, 60, 80].map(x => (
                            <line key={x} x1={x} y1="0" x2={x} y2="100" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="2,2" />
                        ))}

                        <path 
                            d={generatePath(actualData)! + ` L 90 100 L 10 100 Z`} 
                            fill="rgba(14, 165, 233, 0.15)" 
                            stroke="none"
                            style={{ transition: 'opacity 0.7s ease-out', opacity: isRevealed ? 1 : 0 }} 
                        />
                        <path 
                            d={generatePath(actualData)!} 
                            fill="none" 
                            stroke="#0ea5e9" 
                            strokeWidth="3" 
                            strokeLinecap="round" 
                            style={{ transition: 'opacity 0.7s ease-out', opacity: isRevealed ? 1 : 0 }} 
                        />
                        <path 
                            d={generatePath(userPoints)!} 
                            fill="none" 
                            stroke="#f59e0b" 
                            strokeWidth="2.5" 
                            strokeDasharray="4,4" 
                            style={{ transition: 'opacity 0.3s', opacity: (!isRevealed || (stats?.accuracy || 0) > 0) ? 1 : 0 }} 
                        />
                        {!isRevealed && userPoints.map((val, i) => (
                            <circle key={i} cx={(i * 20) + 10} cy={(1 - val) * 100} r="3" fill="#f59e0b" />
                        ))}
                    </svg>

                    {!isRevealed && userPoints.every(p => p === 0.2) && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                            <span style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '8px 16px', borderRadius: '6px', fontSize: '11px', color: '#d97706', fontWeight: '600', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)', backdropFilter: 'blur(4px)', border: '1px solid #fde68a' }}>
                                DRAW CURVE
                            </span>
                        </div>
                    )}
                </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: '#64748b', fontWeight: '600', fontFamily: 'monospace', marginTop: '8px', paddingLeft: '32px', paddingRight: '8px' }}>
                <span style={{ color: '#16a34a' }}>A</span>
                <span style={{ color: '#84cc16' }}>B</span>
                <span style={{ color: '#eab308' }}>C</span>
                <span style={{ color: '#f97316' }}>D</span>
                <span style={{ color: '#ef4444' }}>E</span>
            </div>
            
            {isRevealed && stats && (
                <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#16a34a', marginTop: '12px', backgroundColor: '#dcfce7', padding: '8px', borderRadius: '8px', border: '1px solid #bbf7d0', marginLeft: '32px', marginRight: '8px' }}>
                    Match Accuracy: {stats.accuracy}%
                </div>
            )}
        </div>
    );
};

// 2. Side Panel - Improved styling
const SidePanel = ({ selection, onClose, neighbors }: { selection: any[], onClose: () => void, neighbors: any[] }) => {
    if (!selection || selection.length === 0) return null;

    const isMulti = selection.length > 1;
    const primary = selection[0];
    const panelWidth = window.innerWidth < 768 ? Math.min(320, window.innerWidth - 40) : Math.min(400, window.innerWidth * 0.35);
    
    return (
        <div style={{
            position: 'absolute',
            right: 0,
            top: 0,
            height: '100%',
            width: `${panelWidth}px`,
            maxWidth: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(12px)',
            borderLeft: '1px solid #e2e8f0',
            boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.1)',
            padding: window.innerWidth < 768 ? '16px' : '24px',
            overflowY: 'auto',
            zIndex: 40,
            display: 'flex',
            flexDirection: 'column',
            color: '#1e293b'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        {isMulti ? (
                            <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#9333ea', padding: '4px 10px', backgroundColor: '#faf5ff', borderRadius: '12px', border: '1px solid #e9d5ff', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <FlaskConical size={10} /> {selection.length} SELECTED
                            </span>
                        ) : (
                            <>
                                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', padding: '4px 10px', backgroundColor: '#f1f5f9', borderRadius: '12px', border: '1px solid #e2e8f0' }}>{primary.id}</span>
                                <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'white', padding: '4px 10px', borderRadius: '12px', backgroundColor: CLUSTERS[primary.group as keyof typeof CLUSTERS]?.color || "#64748b" }}>
                                    {CLUSTERS[primary.group as keyof typeof CLUSTERS]?.label || primary.group}
                                </span>
                            </>
                        )}
                    </div>
                    <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', lineHeight: '1.2', marginBottom: '8px' }}>{isMulti ? "Custom Cocktail" : primary.name}</h2>
                    {!isMulti && (
                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>Grade:</span>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '6px', color: 'white', backgroundColor: NUTRI_COLORS[primary.score as keyof typeof NUTRI_COLORS] || NUTRI_COLORS.C }}>
                                {primary.score}
                            </span>
                        </div>
                    )}
                </div>
                <button 
                    onClick={onClose} 
                    style={{ padding: '6px', color: '#94a3b8', cursor: 'pointer', borderRadius: '50%', border: 'none', background: 'transparent', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#1e293b'; e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                    <X size={20} />
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, overflowY: 'auto' }}>
                {isMulti && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                        {selection.map((n: any) => (
                            <span key={n.id} style={{ fontSize: '11px', padding: '6px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', color: '#475569', border: '1px solid #e2e8f0', fontWeight: '500' }}>{n.name}</span>
                        ))}
                    </div>
                )}

                <div style={{ background: 'linear-gradient(to bottom right, #eef2ff, #ffffff)', padding: '16px', borderRadius: '12px', border: '1px solid #c7d2fe', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '12px', color: '#312e81', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <ShoppingBag size={14} style={{ color: '#4f46e5' }} /> Found In Products
                        <span style={{ fontSize: '10px', fontWeight: 'normal', color: '#64748b', marginLeft: 'auto' }}>
                            {[...new Set(selection.flatMap((n: any) => n.products || []))].length} total
                        </span>
                    </h4>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
                        {[...new Set(selection.flatMap((n: any) => n.products || []))].slice(0, 20).map((p: string, idx: number) => (
                            <div key={`${p}-${idx}`} style={{ fontSize: '11px', fontWeight: '500', color: '#475569', backgroundColor: 'white', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', wordBreak: 'break-word', lineHeight: '1.4' }}>
                                {p.length > 50 ? p.substring(0, 47) + '...' : p}
                            </div>
                        ))}
                    </div>
                </div>

                {!isMulti && (
                    <>
                        <DistributionPredictor actualData={primary.nutriScoreDist || [0.2, 0.2, 0.2, 0.2, 0.2]} />
                        
                        {neighbors && neighbors.length > 0 && (
                            <div>
                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '12px', color: '#94a3b8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <Share2 size={14} /> Industrial Pairings
                                </h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {neighbors.map((n: any) => (
                                        <span key={n.id} style={{ fontSize: '12px', color: '#475569', backgroundColor: '#f8fafc', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>{n.name || n.id}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

// 3. Search Bar - Improved styling
const SearchBar = ({ onSearch, nodes }: { onSearch: (node: any) => void, nodes: any[] }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);

    useEffect(() => {
        if(query.length < 2) {
            setResults([]);
            return;
        }
        const hits = nodes.filter((n: any) => 
            n.id.toLowerCase().includes(query.toLowerCase()) || 
            n.name.toLowerCase().includes(query.toLowerCase())
        );
        setResults(hits);
    }, [query, nodes]);

    return (
        <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '24px', padding: '8px 16px', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)', width: '240px', transition: 'all 0.2s' }}>
                <Search size={16} style={{ color: '#94a3b8', marginRight: '8px' }} />
                <input 
                    type="text" 
                    placeholder="Find additive..." 
                    style={{ backgroundColor: 'transparent', border: 'none', outline: 'none', fontSize: '13px', width: '100%', color: '#475569' }}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                />
                {query && <button onClick={() => setQuery("")} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '0', marginLeft: '4px' }}><X size={14} style={{ color: '#94a3b8' }} /></button>}
            </div>
            {results.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', width: '100%', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', overflow: 'hidden', zIndex: 50 }}>
                    {results.map((r: any) => (
                        <button 
                            key={r.id} 
                            style={{ width: '100%', textAlign: 'left', padding: '12px 16px', fontSize: '13px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                            onClick={() => { onSearch(r); setQuery(""); }}
                        >
                            <span style={{ fontWeight: '600', color: '#475569', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>{r.id}</span>
                            <span style={{ color: '#64748b', marginLeft: '12px', flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// Brand Filter Component
const BrandFilter = ({ activeBrand, onSelect, availableBrands }: { 
  activeBrand: string | null, 
  onSelect: (id: string | null) => void,
  availableBrands: Array<{ id: string, label: string, count: number }>
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          border: '1px solid',
          cursor: 'pointer',
          transition: 'all 0.2s',
          ...(activeBrand 
            ? { backgroundColor: '#e0e7ff', color: '#4f46e5', borderColor: '#c7d2fe' }
            : { backgroundColor: 'white', color: '#64748b', borderColor: '#cbd5e1' }
          )
        }}
        onMouseEnter={(e) => {
          if (!activeBrand) {
            e.currentTarget.style.backgroundColor = '#f8fafc';
          }
        }}
        onMouseLeave={(e) => {
          if (!activeBrand) {
            e.currentTarget.style.backgroundColor = 'white';
          }
        }}
      >
        <Store size={14} />
        {activeBrand 
          ? availableBrands.find((b: any) => b.id === activeBrand)?.label || 'Brand'
          : 'Brands'}
        <ChevronDown size={12} style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>
      
      {isOpen && (
        <>
          <div 
            style={{ position: 'fixed', inset: 0, zIndex: 40 }} 
            onClick={() => setIsOpen(false)}
          />
          <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', zIndex: 50, minWidth: '200px', maxHeight: '300px', overflowY: 'auto' }}>
            <div style={{ padding: '8px' }}>
              <button
                onClick={() => {
                  onSelect(null);
                  setIsOpen(false);
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: !activeBrand ? '#f1f5f9' : 'transparent',
                  color: !activeBrand ? '#1e293b' : '#64748b',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (activeBrand) e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  if (activeBrand) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                All Brands
              </button>
              <div style={{ borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />
              {availableBrands.length > 0 ? (
                availableBrands.map((brand) => (
                  <button
                    key={brand.id}
                    onClick={() => {
                      onSelect(activeBrand === brand.id ? null : brand.id);
                      setIsOpen(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: activeBrand === brand.id ? '#eef2ff' : 'transparent',
                      color: activeBrand === brand.id ? '#4f46e5' : '#64748b',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (activeBrand !== brand.id) e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (activeBrand !== brand.id) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{brand.label}</span>
                    <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '8px', flexShrink: 0 }}>({brand.count})</span>
                  </button>
                ))
              ) : (
                <div style={{ padding: '12px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No brands available</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Main Visualization2 Component
const Visualization2 = ({ data }: { data: any }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [selection, setSelection] = useState<any[]>([]); 
  const [, setHoveredNode] = useState<any>(null); // Used for hover effects
  const [, setZoomLevel] = useState(1); // Used to track zoom state
  const [viewMode, setViewMode] = useState<'cluster' | 'grade'>('cluster');
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
  const [popupNode, setPopupNode] = useState<any>(null);
  const [, setPopupPosition] = useState<{ x: number, y: number } | null>(null); // Used for popup positioning
  
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);
  const nodesSelectionRef = useRef<d3.Selection<SVGGElement, any, SVGGElement, any> | null>(null);
  const linksSelectionRef = useRef<d3.Selection<SVGLineElement, any, SVGGElement, any> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const minScaleRef = useRef<number>(1);
  const [scrollZoomEnabled, setScrollZoomEnabled] = useState(false);
  const scrollZoomEnabledRef = useRef(false); // Ref for use in zoom filter

  // Extract available brands from dataset
  const availableBrands = useMemo(() => {
    if (data && data.brands && Array.isArray(data.brands)) {
      return data.brands;
    }
    // Fallback: extract from nodes
    const brandMap = new Map<string, number>();
    if (data && data.nodes) {
      data.nodes.forEach((node: any) => {
        if (node.brands && Array.isArray(node.brands)) {
          node.brands.forEach((brand: string) => {
            if (brand && brand.trim()) {
              brandMap.set(brand, (brandMap.get(brand) || 0) + 1);
            }
          });
        }
      });
    }
    return Array.from(brandMap.entries())
      .map(([label, count]) => ({
        id: label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        label: label,
        count: count
      }))
      .filter(b => b.count > 0 && b.label.length > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);
  }, [data]);

  // Keep scroll zoom ref in sync with state (for use in zoom filter)
  useEffect(() => {
    scrollZoomEnabledRef.current = scrollZoomEnabled;
  }, [scrollZoomEnabled]);

  // Process data - filter by brand if selected
  const processedData = useMemo(() => {
    if (!data || !data.nodes) return { nodes: [], links: [] };
    
    let nodes = data.nodes.map((node: any) => ({
      ...node,
      // Use REAL boxPlotData from dataset (already calculated from actual products)
      boxPlotData: node.boxPlotData || [],
      group: node.group || 'GENERAL',
      products: node.products || [],
      brands: node.brands || [],
      risk: node.risk || 'Low',
      desc: node.desc || `Found in ${node.freq || 0} products.`
    }));
    
    // Filter by brand if selected
    if (brandFilter) {
      const selectedBrandLabel = availableBrands.find((b: any) => b.id === brandFilter)?.label;
      if (selectedBrandLabel) {
        nodes = nodes.filter((node: any) => 
          node.brands && node.brands.some((b: string) => b === selectedBrandLabel)
        );
      }
    }
    
    const nodeMap = new Map(nodes.map((n: any) => [n.id, n]));
    const mappedLinks = (data.links || [])
      .map((l: any) => {
        const source = nodeMap.get(l.source) || (typeof l.source === 'object' ? l.source : null);
        const target = nodeMap.get(l.target) || (typeof l.target === 'object' ? l.target : null);
        if (!source || !target) return null;
        return { source, target, weight: l.weight || 1, type: l.type || 'co-occurrence', context: l.context || "Found together" };
      })
      .filter((l: any) => l !== null && l.source && l.target);
    
    return { nodes, links: mappedLinks };
  }, [data, brandFilter, availableBrands]);

  const getNeighbors = (nodeId: string) => {
    if(!nodeId || !processedData.links) return [];
    const neighbors: any[] = [];
    processedData.links.forEach((l: any) => {
      const sId = l.source.id;
      const tId = l.target.id;
      if (sId === nodeId) neighbors.push(l.target);
      if (tId === nodeId) neighbors.push(l.source);
    });
    return neighbors;
  };

  const handleNodeClick = (node: any, event: any) => {
    if (event.metaKey || event.ctrlKey) {
      setSelection(prev => {
        const exists = prev.find((n: any) => n.id === node.id);
        if (exists) return prev.filter((n: any) => n.id !== node.id);
        return [...prev, node];
      });
    } else {
      // Show popup with large box plot and center the node between the two popups
      setSelection([node]);
      setPopupNode(node);
      
      // Zoom in and center the clicked node between the left popup and right side panel
      // Use requestAnimationFrame to ensure node positions are set
      requestAnimationFrame(() => {
        if (containerRef.current && svgRef.current && zoomRef.current && node.x !== undefined && node.y !== undefined) {
          const containerWidth = containerRef.current.clientWidth;
          const containerHeight = containerRef.current.clientHeight;
          const svg = d3.select(svgRef.current);
          const svgElement = svg.node() as SVGSVGElement;
          
          // Get current zoom transform to check current scale
          const currentTransform = d3.zoomTransform(svgElement);
          const currentScale = currentTransform.k || 1;
          
          // Left popup: left: 20px, width: 400px (ends at 420px)
          // Right panel: dynamic width based on screen size
          const panelWidth = window.innerWidth < 768 ? Math.min(320, window.innerWidth - 40) : Math.min(400, window.innerWidth * 0.35);
          const leftPopupEnd = 420;
          const rightPanelStart = containerWidth - panelWidth;
          const centerBetweenPopups = (leftPopupEnd + rightPanelStart) / 2;
          
          // Zoom scale - ensure we always zoom IN (scale must be > current scale)
          // Use a much higher fixed scale for deeper zoom
          const targetScale = Math.max(5.0, currentScale * 2.5); // At least 5.0x for deep zoom, or 2.5x current if already zoomed
          const centerY = containerHeight / 2;
          
          // Calculate translation to center the node
          // The mainGroup is centered at (width/2, height/2) in the SVG coordinate system
          // Node position in data space: (node.x, node.y) relative to mainGroup center (0,0)
          // After zoom transform: mainGroup transform = translate(width/2 + translateX, height/2 + translateY) scale(scale)
          // Node screen position: (width/2 + translateX + node.x * scale, height/2 + translateY + node.y * scale)
          // We want: screenX = centerBetweenPopups, screenY = centerY
          // So: translateX = centerBetweenPopups - width/2 - (node.x * scale)
          //     translateY = centerY - height/2 - (node.y * scale)
          const translateX = centerBetweenPopups - containerWidth / 2 - (node.x * targetScale);
          const translateY = centerY - containerHeight / 2 - (node.y * targetScale);
          
          // Apply zoom transform with smooth transition
          if (zoomRef.current) {
            const newTransform = d3.zoomIdentity
              .translate(translateX, translateY)
              .scale(targetScale);
            
            // Use the zoom behavior's transform method directly
            svg.transition()
              .duration(750)
              .ease(d3.easeCubicOut)
              .call(zoomRef.current.transform as any, newTransform);
          }
        }
      });
    }
  };

  useEffect(() => {
    if (!processedData.nodes.length || !containerRef.current || !svgRef.current) return;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    d3.select(svgRef.current).selectAll("*").remove();
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");
    
    const mainGroup = svg.append("g")
      .attr("transform", `translate(${width/2}, ${height/2})`);

    const maxFreqValue = (d3.max(processedData.nodes, (d: any) => {
      const freq = typeof d.freq === 'number' ? d.freq : Number(d.freq) || 0;
      return freq;
    }) || 5000);
    const rScale = d3.scaleSqrt<number, number>()
      .domain([0, Number(maxFreqValue)] as [number, number])
      .range([20, 55]);

    const bgLayer = mainGroup.append("g").attr("class", "background-layer");
    const hullG = mainGroup.append("g").attr("class", "hulls"); 
    const linkG = mainGroup.append("g").attr("class", "links");
    const nodeG = mainGroup.append("g").attr("class", "nodes");

    // Grade zones
    if (viewMode === 'grade') {
      const zoneWidth = width / 5;
      const zones = bgLayer.selectAll(".grade-zone")
        .data(Object.entries(GRADE_ZONES))
        .join("g")
        .attr("class", "grade-zone");
      
      zones.append("rect")
        .attr("x", (_d: any, i: number) => -width/2 + i * zoneWidth)
        .attr("y", -height/2 + 60)
        .attr("width", zoneWidth)
        .attr("height", height - 120)
        .attr("fill", (d: any) => d[1].color)
        .attr("fill-opacity", 0.12)
        .attr("stroke", (d: any) => d[1].color)
        .attr("stroke-width", 2)
        .attr("stroke-opacity", 0.4)
        .attr("rx", 20);

      zones.append("text")
        .attr("x", (_d: any, i: number) => -width/2 + i * zoneWidth + zoneWidth/2)
        .attr("y", -height/2 + 40)
        .attr("text-anchor", "middle")
        .style("fill", (d: any) => d[1].color)
        .style("font-size", "24px")
        .style("font-weight", "900")
        .style("font-family", "sans-serif")
        .text((d: any) => d[1].label.toUpperCase());
    }

    const link = linkG.selectAll("line")
      .data(processedData.links)
      .join("line")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", (d: any) => Math.sqrt(d.weight || 1) * 0.5);
    
    linksSelectionRef.current = link as any;

    const node = nodeG.selectAll("g")
      .data(processedData.nodes)
      .join("g");

    nodesSelectionRef.current = node as any;

    node.append("circle")
      .attr("r", (d: any) => rScale(d.freq))
      .attr("fill", (d: any) => {
        const score = (d.score || 'C').toUpperCase();
        return NUTRI_COLORS[score as keyof typeof NUTRI_COLORS] || NUTRI_COLORS.C;
      })
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .style("transition", "all 0.2s");

    const macroG = node.append("g").attr("class", "macro-view");
    macroG.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.3em")
      .style("font-size", (d: any) => Math.min(12, rScale(d.freq)/2) + "px")
      .style("fill", "#ffffff")
      .style("font-weight", "700")
      .style("text-shadow", "0 1px 3px rgba(0,0,0,0.5)")
      .text((d: any) => d.id);

    // Micro View (Box Plot) - Improved styling
    // Simple view: just E number (for nodes not in top 5 when zoomed)
    const simpleG = node.append("g").attr("class", "simple-view").attr("opacity", 0);
    simpleG.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .style("font-size", (d: any) => Math.min(14, rScale(d.freq)/2.5) + "px")
      .style("fill", "#1e293b")
      .style("font-weight", "800")
      .style("font-family", "monospace")
      .style("text-shadow", "0 1px 3px rgba(255, 255, 255, 0.9)")
      .text((d: any) => d.id);
    
    node.append("g").attr("class", "micro-view").attr("opacity", 0);
    node.each(function(d: any) {
      const g = d3.select(this).select(".micro-view");
      const r = rScale(d.freq);
      
      // Size the box plot to be much larger and visible
      // Use a larger multiplier to make it clearly visible
      const maxSize = (r - 2) * 2.2; // Larger size for visibility
      const w = maxSize;
      const h = maxSize;
      const x = -w/2;
      const y = -h/2;

      g.append("clipPath").attr("id", `clip-${d.id}`).append("circle").attr("r", r - 2);
      const content = g.append("g").attr("clip-path", `url(#clip-${d.id})`);
      
      // Background rectangle - more visible border
      content.append("rect")
        .attr("x", x)
        .attr("y", y)
        .attr("width", w)
        .attr("height", h)
        .attr("fill", "#ffffff")
        .attr("rx", 6)
        .attr("stroke", "#cbd5e1")
        .attr("stroke-width", 1.5);
      
      // Get only Nova groups that have data
      const availableNovaGroups = d.boxPlotData && Array.isArray(d.boxPlotData) 
        ? d.boxPlotData.filter((bp: any) => bp.min !== null && bp.q1 !== null && bp.median !== null && bp.q3 !== null && bp.max !== null)
            .map((bp: any) => bp.nova)
            .sort((a: number, b: number) => a - b)
        : [];
      
      if (availableNovaGroups.length === 0) {
        // If no box plot data, just show name and E-number centered
        content.append("text")
          .attr("x", 0)
          .attr("y", y + h/2 - 8)
          .attr("text-anchor", "middle")
          .style("fill", "#1e293b")
          .style("font-family", "sans-serif")
          .style("font-size", Math.min(10, r/4) + "px")
          .style("font-weight", "700")
          .text(d.name.substring(0, 15));
        content.append("text")
          .attr("x", 0)
          .attr("y", y + h/2 + 8)
          .attr("text-anchor", "middle")
          .style("fill", "#64748b")
          .style("font-family", "monospace")
          .style("font-size", Math.min(9, r/5) + "px")
          .style("font-weight", "600")
          .text(d.id);
        return;
      }
      
      // Optimized margins - give more space to the plot area
      const margin = {top: 18, right: 8, bottom: 18, left: 22};
      const plotW = w - margin.left - margin.right;
      const plotH = h - margin.top - margin.bottom;
      const plotX = x + margin.left;
      const plotY = y + margin.top;

      // Y-axis: -15 (best) at bottom, 40 (worst) at top - includes negative values
      const scaleY = d3.scaleLinear().domain([-15, 40]).range([plotY + plotH, plotY]);
      const scaleX = d3.scaleBand().domain(availableNovaGroups.map(String)).range([plotX, plotX + plotW]).padding(0.3);

      // Background - light grey like popup
      content.append("rect")
        .attr("x", plotX)
        .attr("y", plotY)
        .attr("width", plotW)
        .attr("height", plotH)
        .attr("fill", "#f8fafc")
        .attr("stroke", "#e2e8f0")
        .attr("stroke-width", 0.5);

      // Grid lines (fewer to reduce clutter) - include negative values
      [-15, 0, 20, 40].forEach(v => {
        const ty = scaleY(v);
        content.append("line")
          .attr("x1", plotX)
          .attr("x2", plotX + plotW)
          .attr("y1", ty)
          .attr("y2", ty)
          .attr("stroke", "#e2e8f0")
          .attr("stroke-width", 0.4)
          .attr("stroke-dasharray", "1,1");
      });

      // Y-axis line (thicker for visibility)
      content.append("line")
        .attr("x1", plotX)
        .attr("x2", plotX)
        .attr("y1", plotY)
        .attr("y2", plotY + plotH)
        .attr("stroke", "#1e293b")
        .attr("stroke-width", Math.max(1.5, r/20));
      
      // Y-axis labels: Show key values with larger, more visible text - include negative
      [-15, 0, 20, 40].forEach(v => {
        const ty = scaleY(v);
        content.append("line")
          .attr("x1", plotX - 3)
          .attr("x2", plotX)
          .attr("y1", ty)
          .attr("y2", ty)
          .attr("stroke", "#1e293b")
          .attr("stroke-width", Math.max(1.2, r/20));
        content.append("text")
          .attr("x", plotX - 5)
          .attr("y", ty + 3)
          .attr("text-anchor", "end")
          .text(v)
          .style("fill", "#1e293b")
          .style("font-size", Math.max(9, Math.min(11, r/4)) + "px")
          .style("font-family", "sans-serif")
          .style("font-weight", "700");
      });

      // X-axis line (thicker for visibility)
      content.append("line")
        .attr("x1", plotX)
        .attr("x2", plotX + plotW)
        .attr("y1", plotY + plotH)
        .attr("y2", plotY + plotH)
        .attr("stroke", "#1e293b")
        .attr("stroke-width", Math.max(1.5, r/20));
      
      // X-axis labels: Only show Nova groups with data (larger for visibility)
      availableNovaGroups.forEach((nova: number) => {
        const tx = scaleX(String(nova))! + scaleX.bandwidth()! / 2;
        content.append("text")
          .attr("x", tx)
          .attr("y", plotY + plotH + 7)
          .attr("text-anchor", "middle")
          .text(nova)
          .style("fill", "#1e293b")
          .style("font-size", Math.max(9, Math.min(11, r/4)) + "px")
          .style("font-family", "sans-serif")
          .style("font-weight", "700");
      });
      
      // Axis titles (very small to save space, only if there's room)
      if (r > 40) {
        content.append("text")
          .attr("x", plotX + plotW / 2)
          .attr("y", plotY + plotH + 14)
          .attr("text-anchor", "middle")
          .text("Nova")
          .style("fill", "#475569")
          .style("font-size", Math.min(6, r/8) + "px")
          .style("font-family", "sans-serif")
          .style("font-weight", "700");
        
        content.append("text")
          .attr("x", plotX - 6)
          .attr("y", plotY + plotH / 2)
          .attr("text-anchor", "middle")
          .attr("transform", `rotate(-90, ${plotX - 6}, ${plotY + plotH / 2})`)
          .text("Nutri")
          .style("fill", "#475569")
          .style("font-size", Math.min(6, r/8) + "px")
          .style("font-family", "sans-serif")
          .style("font-weight", "700");
      }

      // Box plots with REAL data - only show if data exists
      if (d.boxPlotData && Array.isArray(d.boxPlotData) && d.boxPlotData.length > 0) {
        d.boxPlotData.forEach((bp: any) => {
          if (bp.min === null || bp.q1 === null || bp.median === null || bp.q3 === null || bp.max === null) return;
          if (!availableNovaGroups.includes(bp.nova)) return; // Only show if in available groups
          
          const bx = scaleX(String(bp.nova));
          const bw = scaleX.bandwidth();
          const centerX = bx! + bw!/2;
          
          // Color by Nova group (matching screenshot style)
          const novaColors: Record<number, string> = {
            1: "#16a34a", // Green
            2: "#f59e0b", // Orange/Amber
            3: "#f97316", // Orange
            4: "#ef4444"  // Red
          };
          const color = novaColors[bp.nova] || "#475569";
          
          // Whisker (thicker for visibility)
          content.append("line")
            .attr("x1", centerX)
            .attr("x2", centerX)
            .attr("y1", scaleY(bp.min))
            .attr("y2", scaleY(bp.max))
            .attr("stroke", color)
            .attr("stroke-width", Math.max(2, r/15));
          
          // Box (thicker for visibility)
          const q1Y = scaleY(bp.q1);
          const q3Y = scaleY(bp.q3);
          const boxHeight = Math.abs(q3Y - q1Y);
          const boxY = Math.min(q1Y, q3Y);
          
          content.append("rect")
            .attr("x", bx ?? 0)
            .attr("width", bw)
            .attr("y", boxY)
            .attr("height", Math.max(2, boxHeight))
            .attr("fill", color)
            .attr("fill-opacity", 0.7)
            .attr("stroke", "#1e293b")
            .attr("stroke-width", Math.max(1.5, r/20));
          
          // Median line (thicker for visibility)
          content.append("line")
            .attr("x1", bx ?? 0)
            .attr("x2", (bx ?? 0) + bw)
            .attr("y1", scaleY(bp.median))
            .attr("y2", scaleY(bp.median))
            .attr("stroke", "#1e293b")
            .attr("stroke-width", Math.max(2, r/15));
          
          // Outliers (larger circles for visibility)
          if (bp.outliers && Array.isArray(bp.outliers) && bp.outliers.length > 0) {
            bp.outliers.forEach((outlier: number) => {
              content.append("circle")
                .attr("cx", centerX)
                .attr("cy", scaleY(outlier))
                .attr("r", Math.max(2, r/20))
                .attr("fill", color)
                .attr("stroke", "#1e293b")
                .attr("stroke-width", 0.8);
            });
          }
        });
      }
    });

    const lineGenerator = d3.line().curve(d3.curveCatmullRomClosed).x((d: any) => d[0]).y((d: any) => d[1]);

    const padding = 50;
    const minY = -height/2 + padding + 60;
    const maxY = height/2 - padding - 60;
    const zoneWidth = width / 5;
    const gradeCenters: Record<string, number> = {
      'A': -width/2 + zoneWidth/2,
      'B': -width/2 + zoneWidth * 1.5,
      'C': -width/2 + zoneWidth * 2.5,
      'D': -width/2 + zoneWidth * 3.5,
      'E': -width/2 + zoneWidth * 4.5
    };

    const linkForce = d3.forceLink(processedData.links)
      .id((d: any) => d.id)
      .distance((d: any) => 100 + Math.sqrt(d.weight || 1) * 10)
      .strength(0.5);
    
    simulationRef.current = d3.forceSimulation(processedData.nodes as any)
      .force("link", linkForce)
      .force("charge", d3.forceManyBody().strength(-300))
      .force("collide", d3.forceCollide((d: any) => rScale(d.freq) + 10))
      .alphaDecay(0.1) // Faster decay to stop simulation quickly
      .on("end", () => {
        // Fix all node positions after simulation ends
        processedData.nodes.forEach((d: any) => {
          if (d.x !== undefined && d.y !== undefined) {
            d.fx = d.x;
            d.fy = d.y;
          }
        });
        if (simulationRef.current) {
          simulationRef.current.stop(); // Ensure simulation is stopped
        }
        // Force a redraw to ensure positions are set
        if (nodesSelectionRef.current) {
          nodesSelectionRef.current.attr("transform", (d: any) => {
            if (d.x !== undefined && d.y !== undefined) {
              return `translate(${d.x},${d.y})`;
            }
            return `translate(0,0)`;
          });
        }
      });

    simulationRef.current.on("tick", () => {
      processedData.nodes.forEach((d: any) => {
        const r = rScale(d.freq);
        if (d.x !== undefined && d.y !== undefined) {
          if (viewMode === 'grade') {
            const grade = (d.score || 'C').toUpperCase();
            const centerX = gradeCenters[grade] || gradeCenters['C'];
            const zoneMinX = centerX - zoneWidth/2 + padding;
            const zoneMaxX = centerX + zoneWidth/2 - padding;
            d.x = Math.max(zoneMinX + r, Math.min(zoneMaxX - r, d.x));
          } else {
            const minX = -width/2 + padding + r;
            const maxX = width/2 - padding - r;
            d.x = Math.max(minX, Math.min(maxX, d.x));
          }
          d.y = Math.max(minY + r, Math.min(maxY - r, d.y));
        }
      });
      
      link.attr("x1", (d: any) => d.source.x).attr("y1", (d: any) => d.source.y).attr("x2", (d: any) => d.target.x).attr("y2", (d: any) => d.target.y);
      node.attr("transform", (d: any) => {
        // Ensure x and y are defined before using them
        if (d.x !== undefined && d.y !== undefined) {
          return `translate(${d.x},${d.y})`;
        }
        return `translate(0,0)`;
      });

      // Only show hulls in cluster mode
      const groups = d3.groups(processedData.nodes, (d: any) => d.group);
      const shouldShowHulls = viewMode === 'cluster';
      
      hullG.selectAll("path").data(shouldShowHulls ? groups : []).join("path")
        .attr("d", ([_groupId, nodes]: any) => {
          const points = nodes.map((n: any) => [n.x, n.y]);
          if (points.length < 3) return ""; 
          const hull = d3.polygonHull(points as [number, number][]);
          return hull ? lineGenerator(hull) : "";
        })
        .attr("fill", (d: any) => CLUSTERS[d[0] as keyof typeof CLUSTERS]?.color || "#64748b")
        .attr("fill-opacity", shouldShowHulls ? 0.2 : 0)
        .attr("stroke", (d: any) => CLUSTERS[d[0] as keyof typeof CLUSTERS]?.color || "#64748b")
        .attr("stroke-width", 3)
        .attr("stroke-opacity", shouldShowHulls ? 0.6 : 0)
        .attr("stroke-linejoin", "round")
        .attr("stroke-dasharray", "8,4");
      
      // Add labels to hulls showing cluster names (only in cluster mode)
      hullG.selectAll("text.hull-label").data(shouldShowHulls ? groups : []).join("text")
        .attr("class", "hull-label")
        .attr("x", ([_g, n]: any) => {
          if (n.length < 3) return 0;
          const centroid = d3.polygonCentroid(n.map((p: any) => [p.x, p.y]));
          return centroid[0];
        })
        .attr("y", ([_g, n]: any) => {
          if (n.length < 3) return 0;
          const centroid = d3.polygonCentroid(n.map((p: any) => [p.x, p.y]));
          return centroid[1];
        })
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .style("fill", (d: any) => CLUSTERS[d[0] as keyof typeof CLUSTERS]?.color || "#64748b")
        .style("font-weight", "900")
        .style("font-size", "18px")
        .style("opacity", shouldShowHulls ? 1 : 0)
        .style("pointer-events", "none")
        .style("text-shadow", "0 2px 6px rgba(255, 255, 255, 1), 0 0 12px rgba(255, 255, 255, 0.8)")
        .style("font-family", "sans-serif")
        .style("letter-spacing", "0.05em")
        .text((d: any) => {
          const cluster = CLUSTERS[d[0] as keyof typeof CLUSTERS];
          return cluster ? cluster.label.toUpperCase() : d[0];
        });
    });

    const contentBounds = { minX: -width/2, maxX: width/2, minY: -height/2, maxY: height/2 };
    const contentWidth = contentBounds.maxX - contentBounds.minX;
    const contentHeight = contentBounds.maxY - contentBounds.minY;
    const minScaleX = width / contentWidth;
    const minScaleY = height / contentHeight;
    const minScale = Math.min(minScaleX, minScaleY) * 0.95;
    minScaleRef.current = minScale;
    
    let zoomTimeout: any | null = null;
    
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([minScale, 8]) // Increased max scale to allow deeper zoom
      .translateExtent([[-width, -height], [width * 2, height * 2]]) // Allow panning within bounds
      .filter((event: any) => {
        // Only allow scroll wheel zoom when explicitly enabled via toggle button
        if (event.type === 'wheel') {
          if (scrollZoomEnabledRef.current) {
            event.preventDefault();
            event.stopPropagation();
            return true;
          }
          // Let scroll pass through to page for scrollytelling
          return false;
        }
        // Allow mouse drag for panning
        if (event.type === 'mousedown' || event.type === 'mousemove') {
          return event.button === 0 || event.button === undefined;
        }
        // Allow touch events
        if (event.type === 'touchstart' || event.type === 'touchmove' || event.type === 'touchend') {
          return true;
        }
        // Allow double-click for zoom
        if (event.type === 'dblclick') {
          return true;
        }
        return true;
      })
      .on("zoom", (e: any) => {
        if (zoomTimeout) return;
        zoomTimeout = setTimeout(() => { zoomTimeout = null; }, 16);
        
        setZoomLevel(e.transform.k);
        const t = e.transform;
        
        // Apply transform - drag/pan and programmatic transforms
        mainGroup.attr("transform", `translate(${width/2 + t.x}, ${height/2 + t.y}) scale(${t.k})`);
        
        requestAnimationFrame(() => {
          if (t.k > 1.5) {
            // When zoomed in, only show box plots for the 5 closest nodes to viewport center
            const viewportCenterX = width / 2;
            const viewportCenterY = height / 2;
            
            // Calculate distances and sort nodes by distance from viewport center
            // Nodes are positioned relative to (width/2, height/2) in mainGroup
            const nodesWithDistance = processedData.nodes.map((node: any) => {
              if (node.x === undefined || node.y === undefined) return { node, distance: Infinity };
              // Transform node position to screen coordinates
              // mainGroup is at (width/2, height/2), then transformed by t
              const screenX = width/2 + (node.x * t.k) + t.x;
              const screenY = height/2 + (node.y * t.k) + t.y;
              const distance = Math.sqrt(Math.pow(screenX - viewportCenterX, 2) + Math.pow(screenY - viewportCenterY, 2));
              return { node, distance };
            }).sort((a: any, b: any) => a.distance - b.distance);
            
            // Show only top 5 closest nodes
            const visibleNodeIds = new Set(nodesWithDistance.slice(0, 5).map(({ node }: { node: any }) => node.id));
            
            nodeG.selectAll("g").each(function(d: any) {
              const isVisible = visibleNodeIds.has(d.id);
              // Hide miniplots completely on zoom
              d3.select(this).selectAll(".micro-view").attr("opacity", 0);
              d3.select(this).selectAll(".simple-view").attr("opacity", isVisible ? 0 : 1);
              // Always show E-number (macro-view) even when zoomed in, but make it more visible for top 5
              d3.select(this).selectAll(".macro-view").attr("opacity", isVisible ? 1 : 0.3);
            });
            
            linkG.attr("opacity", 0.05);
          } else {
            // When zoomed out, hide miniplots for selected nodes, but always show E-number
            nodeG.selectAll("g").each(function(_d: any) {
              d3.select(this).selectAll(".micro-view").attr("opacity", 0);
              d3.select(this).selectAll(".simple-view").attr("opacity", 0);
              // Always show E-number (macro-view)
              d3.select(this).selectAll(".macro-view").attr("opacity", 1);
            });
            linkG.attr("opacity", 1);
          }
        });
      });

    const svgSelection = d3.select(svgRef.current);
    svgSelection.call(zoom as any);
    // Set initial zoom transform
    svgSelection.call(zoom.transform as any, d3.zoomIdentity.scale(minScale));
    zoomRef.current = zoom;

    function dragstarted(event: any, d: any) {
      event.sourceEvent.stopPropagation();
      // Don't restart simulation - keep nodes fixed
      d.fx = d.x; d.fy = d.y;
    }
    function dragged(event: any, d: any) { 
      event.sourceEvent.stopPropagation();
      // Allow dragging but keep position fixed
      d.fx = event.x; d.fy = event.y; 
    }
    function dragended(event: any, d: any) {
      event.sourceEvent.stopPropagation();
      // Keep position fixed after drag
      d.fx = d.x; d.fy = d.y;
    }
    
    const nodeDrag = d3.drag<SVGGElement, any>()
      .filter((event: any) => event.button === 0 && !event.ctrlKey && !event.metaKey)
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
    
    node.call(nodeDrag as any);
    node.on("click", (e: any, d: any) => handleNodeClick(d, e));

    node.on("mouseover", function(_e: any, d: any) {
      setHoveredNode(d);
      const targetNode = d;
      const linkedIds = new Set();
      processedData.links.forEach((l: any) => {
        if (l.source.id === targetNode.id) linkedIds.add(l.target.id);
        if (l.target.id === targetNode.id) linkedIds.add(l.source.id);
      });
      nodesSelectionRef.current!.transition().duration(200).attr("opacity", (o: any) => (o.id === targetNode.id || linkedIds.has(o.id)) ? 1 : 0.15);
      linksSelectionRef.current!.transition().duration(200).attr("stroke-opacity", (l: any) => (l.source.id === targetNode.id || l.target.id === targetNode.id) ? 1 : 0.05).attr("stroke", (l: any) => (l.source.id === targetNode.id || l.target.id === targetNode.id) ? "#f59e0b" : "#cbd5e1").attr("stroke-width", (l: any) => (l.source.id === targetNode.id || l.target.id === targetNode.id) ? 2 : 1);
    }).on("mouseout", function() {
      setHoveredNode(null);
      nodesSelectionRef.current!.transition().duration(200).attr("opacity", 1);
      linksSelectionRef.current!.transition().duration(200).attr("stroke-opacity", 0.4).attr("stroke", "#cbd5e1").attr("stroke-width", 1);
    });
  }, [processedData.nodes.length, processedData.links.length, viewMode, popupNode]);

  // Hide miniplot for selected node when popupNode changes
  useEffect(() => {
    if (!nodesSelectionRef.current) return;
    const nodes = nodesSelectionRef.current;
    
    nodes.each(function(d: any) {
      const isSelected = popupNode && popupNode.id === d.id;
      d3.select(this).selectAll(".micro-view").attr("opacity", isSelected ? 0 : d3.select(this).selectAll(".micro-view").attr("opacity") || 0);
    });
  }, [popupNode]);

  useEffect(() => {
    if(!simulationRef.current || !svgRef.current || !containerRef.current) return;
    const sim = simulationRef.current;
    const svg = d3.select(svgRef.current);
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    const zoneWidth = containerWidth / 5;
    
    // Calculate rScale for collision detection
    const maxFreqForCollision = (d3.max(processedData.nodes, (d: any) => {
      const freq = typeof d.freq === 'number' ? d.freq : Number(d.freq) || 0;
      return freq;
    }) || 5000);
    const rScale = d3.scaleSqrt<number, number>()
      .domain([0, Number(maxFreqForCollision)] as [number, number])
      .range([20, 55]);
    
    const gradeCenters: Record<string, number> = {
      'A': -containerWidth/2 + zoneWidth/2,
      'B': -containerWidth/2 + zoneWidth * 1.5,
      'C': -containerWidth/2 + zoneWidth * 2.5,
      'D': -containerWidth/2 + zoneWidth * 3.5,
      'E': -containerWidth/2 + zoneWidth * 4.5
    };
    
    // IMPORTANT: Unfix all node positions when switching view modes
    // This allows the simulation to reposition nodes according to the new layout
    processedData.nodes.forEach((d: any) => {
      d.fx = null;
      d.fy = null;
    });
    
    if (viewMode === 'cluster') {
      svg.selectAll(".grade-zone").transition().attr("opacity", 0);
      svg.selectAll(".hulls").transition().attr("opacity", 1); 
      
      // Filter links to only show within-cluster connections (optional - can show all)
      // For now, we'll show all links but with reduced strength
      const clusterLinks = processedData.links.filter((_l: any) => {
        // Optionally filter: only show links within same cluster
        // return l.source.group === l.target.group;
        return true; // Show all links for now
      });
      
      // Stronger forces to separate clusters - use smaller multiplier to bring clusters closer
      const clusterSpread = 0.35; // Reduced from 0.6 to 0.35 to bring clusters closer together
      sim.force("x", d3.forceX((d: any) => {
        const cluster = CLUSTERS[d.group as keyof typeof CLUSTERS];
        return cluster ? cluster.x * (containerWidth * clusterSpread) : 0;
      }).strength(0.9)) // Keep strong to maintain separation
        .force("y", d3.forceY((d: any) => {
          const cluster = CLUSTERS[d.group as keyof typeof CLUSTERS];
          return cluster ? cluster.y * (containerHeight * clusterSpread) : 0;
        }).strength(0.9)) // Keep strong to maintain separation
        .force("link", d3.forceLink(clusterLinks).id((d: any) => d.id).distance((d: any) => {
          // Shorter distance for within-cluster links, longer for cross-cluster
          const sameCluster = d.source.group === d.target.group;
          return sameCluster ? (40 + Math.sqrt(d.weight || 1) * 6) : (120 + Math.sqrt(d.weight || 1) * 15);
        }).strength((d: any) => {
          // Stronger within-cluster, weaker cross-cluster
          const sameCluster = d.source.group === d.target.group;
          return sameCluster ? 0.8 : 0.15;
        }))
        .force("charge", d3.forceManyBody().strength(-800)) // Reduced from -1000 to allow clusters closer
        .force("collide", d3.forceCollide((d: any) => {
          const r = rScale(d.freq);
          return r + 25; // More spacing between nodes
        }).strength(1.0)); // Maximum collision strength to prevent overlap
    } else {
      svg.selectAll(".grade-zone").transition().attr("opacity", 1);
      svg.selectAll(".hulls").transition().attr("opacity", 0); 
      sim.force("x", d3.forceX((d: any) => {
        const grade = (d.score || 'C').toUpperCase();
        return gradeCenters[grade] || gradeCenters['C'];
      }).strength(0.8))
      .force("y", d3.forceY(0).strength(0.3))
      .force("link", d3.forceLink(processedData.links).id((d: any) => d.id).distance((d: any) => 100 + Math.sqrt(d.weight || 1) * 10).strength(0.3));
    }
    
    // Run simulation longer to ensure proper clustering
    sim.alpha(1).alphaDecay(0.05).restart(); // Slower decay for better convergence
    
    // After simulation completes, fix all positions
    const fixPositions = () => {
      if (simulationRef.current) {
        processedData.nodes.forEach((d: any) => {
          if (d.x !== undefined && d.y !== undefined) {
            d.fx = d.x;
            d.fy = d.y;
          }
        });
        sim.stop(); // Stop the simulation
      }
    };
    
    // Wait longer for simulation to complete, especially for cluster mode
    const waitTime = viewMode === 'cluster' ? 3000 : 2000;
    setTimeout(fixPositions, waitTime);
    
    // Also fix positions when simulation naturally ends
    sim.on("end", fixPositions);
  }, [viewMode, processedData.links]);

  // Filter nodes by brand
  useEffect(() => {
    if (!nodesSelectionRef.current) return;
    const nodes = nodesSelectionRef.current;
    
    if (brandFilter && viewMode === 'grade') {
      const selectedBrandLabel = availableBrands.find((b: any) => b.id === brandFilter)?.label;
      if (selectedBrandLabel) {
        nodes.transition().duration(500).attr("opacity", (d: any) => {
          if (d.brands && d.brands.includes(selectedBrandLabel)) {
            return 1;
          }
          return 0.15;
        });
        nodes.filter((d: any) => {
          return d.brands && d.brands.includes(selectedBrandLabel);
        })
          .transition().duration(500)
          .select("circle")
          .attr("stroke", "#6366f1")
          .attr("stroke-width", 4);
        nodes.filter((d: any) => {
          return !d.brands || !d.brands.includes(selectedBrandLabel);
        })
          .transition().duration(500)
          .select("circle")
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 2);
      }
    } else {
      nodes.transition().duration(500).attr("opacity", 1);
      nodes.select("circle").attr("stroke", "#ffffff").attr("stroke-width", 2);
    }
  }, [brandFilter, viewMode, availableBrands]);

  if (!data || !processedData.nodes.length) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', color: '#64748b' }}>
        <div style={{ textAlign: 'center' }}>
          <p>Loading additive network data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(to bottom right, #f8fafc, #ffffff, #f1f5f9)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      color: '#1e293b',
      fontFamily: 'sans-serif',
      overflow: 'hidden' // Keep content within container bounds
    }}
    ref={(el) => {
      // Store container ref for popup positioning
      if (el && !containerRef.current) {
        // containerRef is already used for SVG container, so we'll use a different approach
      }
    }}
    >
      {/* HEADER */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 10,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: window.innerWidth < 768 ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '16px',
        pointerEvents: 'none'
      }}>
        <div style={{ flexShrink: 0 }}>
          <h1 style={{
            fontSize: window.innerWidth < 768 ? '20px' : '24px',
            fontWeight: 'bold',
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '4px'
          }}>
            <Beaker style={{ color: '#0ea5e9' }} size={window.innerWidth < 768 ? 22 : 26} />
            Additive Network Analysis
          </h1>
          <p style={{
            fontSize: window.innerWidth < 768 ? '11px' : '13px',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: '500'
          }}>
            Visualizing Co-occurrence in Processed Foods
          </p>
        </div>

        <div style={{
          pointerEvents: 'auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: window.innerWidth < 768 ? '10px' : '16px'
        }}>
          <SearchBar nodes={processedData.nodes} onSearch={(n) => {
            // Set selection and popup
            setSelection([n]); 
            setPopupNode(n);
            
            // Zoom in and center the node (same logic as handleNodeClick)
            requestAnimationFrame(() => {
              if (containerRef.current && svgRef.current && zoomRef.current && n.x !== undefined && n.y !== undefined) {
                const containerWidth = containerRef.current.clientWidth;
                const containerHeight = containerRef.current.clientHeight;
                const svg = d3.select(svgRef.current);
                const svgElement = svg.node() as SVGSVGElement;
                
                // Get current zoom transform to check current scale
                const currentTransform = d3.zoomTransform(svgElement);
                const currentScale = currentTransform.k || 1;
                
                // Left popup: left: 20px, width: 400px (ends at 420px)
                // Right panel: dynamic width based on screen size
                const panelWidth = window.innerWidth < 768 ? Math.min(320, window.innerWidth - 40) : Math.min(400, window.innerWidth * 0.35);
                const leftPopupEnd = 420;
                const rightPanelStart = containerWidth - panelWidth;
                const centerBetweenPopups = (leftPopupEnd + rightPanelStart) / 2;
                
                // Zoom scale - ensure we always zoom IN
                const targetScale = Math.max(5.0, currentScale * 2.5);
                const centerY = containerHeight / 2;
                
                // Calculate translation to center the node
                const translateX = centerBetweenPopups - containerWidth / 2 - (n.x * targetScale);
                const translateY = centerY - containerHeight / 2 - (n.y * targetScale);
                
                // Apply zoom transform with smooth transition
                if (zoomRef.current) {
                  const newTransform = d3.zoomIdentity
                    .translate(translateX, translateY)
                    .scale(targetScale);
                  
                  svg.transition()
                    .duration(750)
                    .ease(d3.easeCubicOut)
                    .call(zoomRef.current.transform as any, newTransform);
                }
              }
            });
          }} />

          {viewMode === 'grade' && availableBrands.length > 0 && (
            <BrandFilter 
              activeBrand={brandFilter} 
              onSelect={(id) => {
                setBrandFilter(id);
              }}
              availableBrands={availableBrands}
            />
          )}
          
          <button
            onClick={() => {
              if (svgRef.current && zoomRef.current && minScaleRef.current) {
                const svg = d3.select(svgRef.current);
                svg.transition().duration(750)
                  .call(zoomRef.current.transform as any, d3.zoomIdentity.scale(minScaleRef.current));
              }
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              backgroundColor: 'white',
              color: '#64748b',
              transition: 'all 0.2s',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
            title="Reset zoom and pan"
          >
            <RefreshCcw size={14} /> Reset View
          </button>
          
          {/* Scroll Zoom Toggle Button */}
          <button
            onClick={() => setScrollZoomEnabled(!scrollZoomEnabled)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: scrollZoomEnabled ? '2px solid #0ea5e9' : '1px solid #e2e8f0',
              cursor: 'pointer',
              backgroundColor: scrollZoomEnabled ? '#e0f2fe' : 'white',
              color: scrollZoomEnabled ? '#0369a1' : '#64748b',
              transition: 'all 0.2s',
              boxShadow: scrollZoomEnabled ? '0 0 0 2px rgba(14, 165, 233, 0.2)' : '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
            onMouseEnter={(e) => {
              if (!scrollZoomEnabled) {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }
            }}
            onMouseLeave={(e) => {
              if (!scrollZoomEnabled) {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }
            }}
            title={scrollZoomEnabled ? "Scroll zoom enabled - click to disable" : "Enable scroll wheel zoom"}
          >
            <MousePointer2 size={14} /> {scrollZoomEnabled ? 'Scroll Zoom: ON' : 'Scroll Zoom: OFF'}
          </button>
          
          <div style={{ display: 'flex', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '4px', gap: '4px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)' }}>
            <button 
              onClick={() => { 
                setViewMode('cluster'); 
                setBrandFilter(null);
              }} 
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                ...(viewMode === 'cluster' ? {
                  backgroundColor: '#1e293b',
                  color: 'white',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                } : {
                  backgroundColor: 'transparent',
                  color: '#64748b'
                })
              }}
              onMouseEnter={(e) => {
                if (viewMode !== 'cluster') {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                }
              }}
              onMouseLeave={(e) => {
                if (viewMode !== 'cluster') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <Share2 size={14} /> Clusters
            </button>
            <button 
              onClick={() => { setViewMode('grade'); }} 
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                ...(viewMode === 'grade' ? {
                  backgroundColor: '#1e293b',
                  color: 'white',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                } : {
                  backgroundColor: 'transparent',
                  color: '#64748b'
                })
              }}
              onMouseEnter={(e) => {
                if (viewMode !== 'grade') {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                }
              }}
              onMouseLeave={(e) => {
                if (viewMode !== 'grade') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <Grid size={14} /> Grades
            </button>
          </div>
        </div>
      </div>

      <div 
        ref={containerRef} 
        style={{ 
          position: 'absolute',
          top: '80px',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          height: 'calc(100% - 80px)',
          overflow: 'hidden'
        }}
      >
        <svg 
          ref={svgRef} 
          style={{ 
            width: '100%', 
            height: '100%', 
            display: 'block', 
            overflow: 'hidden',
            cursor: 'grab'
          }}
        ></svg>
      </div>

      {/* Compact Legend - Inside Container, Bottom Left Corner */}
      <div style={{
        position: 'absolute',
        bottom: '20px', // Position inside the container
        left: '20px',
        zIndex: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        border: '1px solid #e2e8f0',
        padding: '10px 12px',
        borderRadius: '10px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        maxWidth: window.innerWidth < 768 ? '180px' : '200px',
        fontSize: '9px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Nutri-Score</h3>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 2px', marginBottom: '12px' }}>
          {Object.entries(NUTRI_COLORS).map(([grade, color]) => (
            <div key={grade} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '1.5px solid white', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)', backgroundColor: color }}></div>
              <span style={{ fontSize: '8px', color: '#64748b', fontWeight: '600', fontFamily: 'monospace' }}>{grade}</span>
            </div>
          ))}
        </div>
        
        {/* Node Size Explanation */}
        <div style={{ paddingTop: '10px', borderTop: '1px solid #e2e8f0', marginTop: '10px', marginBottom: '10px' }}>
          <div style={{ fontSize: '8px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Node Size</div>
          <div style={{ fontSize: '9px', color: '#475569', lineHeight: '1.4' }}>
            Larger nodes appear in <strong>more products</strong>. Size represents frequency of use.
          </div>
        </div>
        
        {/* Neighbors/Links Explanation */}
        <div style={{ paddingTop: '10px', borderTop: '1px solid #e2e8f0', marginTop: '10px', marginBottom: '10px' }}>
          <div style={{ fontSize: '8px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Connections</div>
          <div style={{ fontSize: '9px', color: '#475569', lineHeight: '1.4' }}>
            Connected additives are <strong>found together</strong> in the same products (co-occurrence).
          </div>
        </div>
        
        {viewMode === 'cluster' && (
          <div style={{ paddingTop: '10px', borderTop: '1px solid #e2e8f0', marginTop: '10px' }}>
            <div style={{ fontSize: '8px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Categories</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', fontSize: '9px' }}>
              {Object.entries(CLUSTERS).slice(0, 4).map(([key, cluster]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: cluster.color, opacity: 0.7, border: `1px solid ${cluster.color}`, flexShrink: 0 }}></div>
                  <span style={{ color: '#475569', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cluster.label}</span>
                </div>
              ))}
            </div>
            {Object.entries(CLUSTERS).length > 4 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '9px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: CLUSTERS.GENERAL.color, opacity: 0.7, border: `1px solid ${CLUSTERS.GENERAL.color}`, flexShrink: 0 }}></div>
                <span style={{ color: '#475569', fontWeight: '500' }}>{CLUSTERS.GENERAL.label}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {selection.length > 0 && (
        <SidePanel 
          selection={selection}
          neighbors={selection.length === 1 ? getNeighbors(selection[0].id) : []}
          onClose={() => {
            setSelection([]);
            setPopupNode(null);
            setPopupPosition(null);
          }}
        />
      )}

      {/* Large Box Plot Popup - Left side of container */}
      {popupNode && selection.length > 0 && (
        <div
          style={{
            position: 'absolute',
            left: '20px', // Left side of container
            top: '0',
            height: '100%',
            zIndex: 45, // Just below SidePanel (40) but above other content
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
            border: '2px solid #e2e8f0',
            padding: '16px',
            width: '400px',
            maxHeight: '100%',
            overflowY: 'auto',
            pointerEvents: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                  {popupNode.name}
                </h3>
                <p style={{ fontSize: '14px', color: '#64748b', fontFamily: 'monospace', fontWeight: '600' }}>
                  {popupNode.id}
                </p>
              </div>
              <button
                onClick={() => {
                  setPopupNode(null);
                  setPopupPosition(null);
                }}
                style={{
                  padding: '4px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  color: '#94a3b8',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.color = '#1e293b';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#94a3b8';
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            <LargeBoxPlotPopup node={popupNode} />
          </div>
      )}
    </div>
  );
};

// Large Box Plot Popup Component - Using Real Dataset
const LargeBoxPlotPopup = ({ node }: { node: any }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!svgRef.current) return;
    
    // Use REAL box plot data from dataset (not generated)
    const boxPlotData = node.boxPlotData || [];
    if (boxPlotData.length === 0) return;
    
    // Only show Nova groups that have data
    const novaGroups = boxPlotData.map((bp: any) => bp.nova).sort((a: number, b: number) => a - b);
    
    // Size to fit container - ensure everything fits within bounds
    const containerWidth = 400; // Max width of popup container (reduced)
    const containerHeight = 300; // Max height of popup container (reduced)
    const legendWidth = 25; // Reduced legend width
    const margin = { top: 45, right: 10, bottom: 55, left: 50 }; // Reduced right margin, adjusted others
    const plotW = containerWidth - margin.left - margin.right - legendWidth - 10; // Reserve space for legend
    const plotH = containerHeight - margin.top - margin.bottom;
    const plotX = margin.left;
    const plotY = margin.top;
    const width = containerWidth;
    const height = containerHeight;

    d3.select(svgRef.current).selectAll("*").remove();
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const content = svg.append("g");

    // Y-axis: -15 (best) at bottom, 40 (worst) at top - includes negative Nutri-Score values
    const scaleY = d3.scaleLinear().domain([-15, 40]).range([plotY + plotH, plotY]);
    const scaleX = d3.scaleBand().domain(novaGroups.map(String)).range([plotX, plotX + plotW]).padding(0.4);

    // Background - light grey grid like screenshot
    content.append("rect")
      .attr("x", plotX)
      .attr("y", plotY)
      .attr("width", plotW)
      .attr("height", plotH)
      .attr("fill", "#f8fafc")
      .attr("stroke", "#e2e8f0")
      .attr("stroke-width", 1);

    // Grid lines - include negative values
    [-15, -10, 0, 10, 20, 30, 40].forEach(v => {
      const ty = scaleY(v);
      content.append("line")
        .attr("x1", plotX)
        .attr("x2", plotX + plotW)
        .attr("y1", ty)
        .attr("y2", ty)
        .attr("stroke", "#e2e8f0")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "2,2");
    });

    // Y-axis line
    content.append("line")
      .attr("x1", plotX)
      .attr("x2", plotX)
      .attr("y1", plotY)
      .attr("y2", plotY + plotH)
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 2);

    // Y-axis labels - include negative values
    [-15, -10, 0, 10, 20, 30, 40].forEach(v => {
      const ty = scaleY(v);
      content.append("line")
        .attr("x1", plotX - 5)
        .attr("x2", plotX)
        .attr("y1", ty)
        .attr("y2", ty)
        .attr("stroke", "#1e293b")
        .attr("stroke-width", 1.5);
      content.append("text")
        .attr("x", plotX - 8)
        .attr("y", ty + 5)
        .attr("text-anchor", "end")
        .text(v)
        .style("fill", "#1e293b")
        .style("font-size", "13px")
        .style("font-family", "sans-serif")
        .style("font-weight", "600");
    });

    // X-axis line
    content.append("line")
      .attr("x1", plotX)
      .attr("x2", plotX + plotW)
      .attr("y1", plotY + plotH)
      .attr("y2", plotY + plotH)
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 2);

    // X-axis labels - "NOVA 1", "NOVA 3", "NOVA 4" format
    novaGroups.forEach((nova: number) => {
      const tx = scaleX(String(nova))! + scaleX.bandwidth()! / 2;
      content.append("text")
        .attr("x", tx)
        .attr("y", plotY + plotH + 25)
        .attr("text-anchor", "middle")
        .text(`NOVA ${nova}`)
        .style("fill", "#1e293b")
        .style("font-size", "14px")
        .style("font-family", "sans-serif")
        .style("font-weight", "700");
    });

    // Axis titles
    content.append("text")
      .attr("x", plotX + plotW / 2)
      .attr("y", height - 15)
      .attr("text-anchor", "middle")
      .text("Nova Group")
      .style("fill", "#475569")
      .style("font-size", "15px")
      .style("font-family", "sans-serif")
      .style("font-weight", "700");

    content.append("text")
      .attr("x", 20)
      .attr("y", plotY + plotH / 2)
      .attr("text-anchor", "middle")
      .attr("transform", `rotate(-90, 20, ${plotY + plotH / 2})`)
      .text("Nutri-Score")
      .style("fill", "#475569")
      .style("font-size", "15px")
      .style("font-family", "sans-serif")
      .style("font-weight", "700");

    // Color mapping for Nova groups (like screenshot: green, orange, red)
    const novaColors: Record<number, string> = {
      1: "#16a34a", // Green
      2: "#f59e0b", // Orange/Amber
      3: "#f97316", // Orange
      4: "#ef4444"  // Red
    };

    // Box plots with REAL data
    boxPlotData.forEach((bp: any) => {
      if (bp.min === null || bp.q1 === null || bp.median === null || bp.q3 === null || bp.max === null) return;
      
      const bx = scaleX(String(bp.nova));
      const bw = scaleX.bandwidth()!;
      const centerX = bx! + bw / 2;
      const color = novaColors[bp.nova] || "#475569";

      // Whisker line
      content.append("line")
        .attr("x1", centerX)
        .attr("x2", centerX)
        .attr("y1", scaleY(bp.min))
        .attr("y2", scaleY(bp.max))
        .attr("stroke", color)
        .attr("stroke-width", 2.5);

      // Box
      const q1Y = scaleY(bp.q1);
      const q3Y = scaleY(bp.q3);
      const boxHeight = Math.abs(q3Y - q1Y);
      const boxY = Math.min(q1Y, q3Y);

      content.append("rect")
        .attr("x", bx ?? 0)
        .attr("width", bw)
        .attr("y", boxY)
        .attr("height", Math.max(3, boxHeight))
        .attr("fill", color)
        .attr("fill-opacity", 0.7)
        .attr("stroke", "#1e293b")
        .attr("stroke-width", 2);

      // Median line
      content.append("line")
        .attr("x1", bx ?? 0)
        .attr("x2", (bx ?? 0) + bw)
        .attr("y1", scaleY(bp.median))
        .attr("y2", scaleY(bp.median))
        .attr("stroke", "#1e293b")
        .attr("stroke-width", 3);

      // Outliers as individual points
      if (bp.outliers && bp.outliers.length > 0) {
        bp.outliers.forEach((outlier: number) => {
          content.append("circle")
            .attr("cx", centerX)
            .attr("cy", scaleY(outlier))
            .attr("r", 4)
            .attr("fill", color)
            .attr("stroke", "#1e293b")
            .attr("stroke-width", 1.5);
        });
      }
    });

    // Nutri-Score Legend on the right (like screenshot) - sized to fit
    const legendX = plotX + plotW + 8; // Reduced spacing
    const legendBarWidth = 25; // Use different variable name
    
    const gradeColors = [
      { grade: 'A', color: '#16a34a', range: [0, 5] },
      { grade: 'B', color: '#84cc16', range: [5, 10] },
      { grade: 'C', color: '#eab308', range: [10, 20] },
      { grade: 'D', color: '#f97316', range: [20, 30] },
      { grade: 'E', color: '#ef4444', range: [30, 40] }
    ];
    
    gradeColors.forEach((grade) => {
      const yStart = scaleY(grade.range[1]);
      const yEnd = scaleY(grade.range[0]);
      const height = Math.abs(yEnd - yStart);
      
      content.append("rect")
        .attr("x", legendX)
        .attr("y", yStart)
        .attr("width", legendBarWidth)
        .attr("height", height)
        .attr("fill", grade.color)
        .attr("stroke", "#1e293b")
        .attr("stroke-width", 1);
      
      // Grade label
      content.append("text")
        .attr("x", legendX + legendBarWidth / 2)
        .attr("y", yStart + height / 2)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .text(grade.grade)
        .style("fill", "#ffffff")
        .style("font-size", "14px")
        .style("font-family", "sans-serif")
        .style("font-weight", "800")
        .style("text-shadow", "0 1px 2px rgba(0, 0, 0, 0.3)");
    });
  }, [node]);

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <svg ref={svgRef} style={{ display: 'block', width: '100%', height: '100%', maxWidth: '400px', maxHeight: '300px' }}></svg>
      <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
          Understanding the Box Plot
        </h4>
        <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.6' }}>
          <p style={{ marginBottom: '8px' }}>
            <strong>Nova Groups (X-axis):</strong> Categories 1-4 represent the level of food processing, where 1 is minimally processed and 4 is ultra-processed.
          </p>
          <p style={{ marginBottom: '8px' }}>
            <strong>Nutri-Score (Y-axis):</strong> Ranges from -15 (best, at bottom) to 40 (worst, at top). Lower scores indicate better nutritional quality.
          </p>
          <p>
            <strong>Box Plot Elements:</strong> Each box shows the distribution of Nutri-Scores for this additive across products in each Nova Group. The box represents the interquartile range (25th-75th percentile), the line inside is the median, and the whiskers extend to min/max values.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Visualization2;
