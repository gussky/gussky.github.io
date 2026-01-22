import React, { useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';

// --- Data ---
// Hardcoded examples provided by user
const PRODUCTS = [
    {
        id: 'p1',
        name: "Key Food Lowfat Cottage Cheese",
        grade: 'c',
        // Shortened slightly for UI, but keeping essential length to show complexity
        ingredients: "Cultured skim milk, pineapple base (pineapple, sugar, water, food starch-modified, brown sugar, salt), milk, nonfat milk, salt, locust bean gum, carrageenan, carbon dioxide, vitamin A palmitate, enzymes.",
        nutrients: {
            Energy: 106,
            Protein: 8.85,
            Fat: 1.33,
            Carbs: 15,
            Sugar: 13.2,
            Sodium: 0.38
        }
    },
    {
        id: 'p2',
        name: "Small Curd Cottage Cheese",
        grade: 'a',
        ingredients: "Cultured skim milk, pineapple base (pineapple, sugar, water, food starch-modified, brown sugar, salt), milk, nonfat milk, salt, locust bean gum, carrageenan, carbon dioxide, vitamin A palmitate, enzymes.",
        nutrients: {
            Energy: 80, // Rounded for display
            Protein: 10.62,
            Fat: 0.88,
            Carbs: 8,
            Sugar: 7,
            Sodium: 0.22
        }
    }
];

// Configuration for features with units
const FEATURE_CONFIG: Record<string, { label: string, unit: string }> = {
    Energy: { label: "Energy", unit: "kcal" },
    Protein: { label: "Protein", unit: "g" },
    Fat: { label: "Fat", unit: "g" },
    Carbs: { label: "Carbs", unit: "g" },
    Sugar: { label: "Sugar", unit: "g" },
    Sodium: { label: "Sodium", unit: "g" }
};

const FEATURES = Object.keys(FEATURE_CONFIG);

// --- Helper to Normalize Data ---
const getMaxValues = (products: typeof PRODUCTS) => {
    const maxes: Record<string, number> = {};
    FEATURES.forEach(feat => {
        // @ts-ignore
        maxes[feat] = Math.max(...products.map(p => p.nutrients[feat] || 0)) * 1.2;
        if (maxes[feat] === 0) maxes[feat] = 1;
    });
    return maxes;
};

// --- D3 Radar Component ---
interface RadarProps {
    width?: number;
    height?: number;
    hoveredProduct: string | null;
    setHoveredProduct: (id: string | null) => void;
}

const ComparisonRadar = ({ width = 400, height = 400, hoveredProduct, setHoveredProduct }: RadarProps) => {
    const svgRef = useRef<SVGSVGElement>(null);

    // Configuration
    const MARGIN = 70; // Increased margin for labels
    const RADIUS = (Math.min(width, height) / 2) - MARGIN;
    const CENTER_X = width / 2;
    const CENTER_Y = height / 2;

    // Scales
    const maxValues = useMemo(() => getMaxValues(PRODUCTS), []);

    const angleScale = d3.scaleLinear()
        .domain([0, FEATURES.length])
        .range([0, 2 * Math.PI]);

    const getPathCoordinates = (product: typeof PRODUCTS[0]) => {
        return FEATURES.map((feat, i) => {
            const angle = angleScale(i) - Math.PI / 2;
            // @ts-ignore
            const value = product.nutrients[feat];
            const radius = (value / maxValues[feat]) * RADIUS;
            return {
                x: CENTER_X + Math.cos(angle) * radius,
                y: CENTER_Y + Math.sin(angle) * radius,
                value: value,
                label: feat
            };
        });
    };

    // Generate Polygons
    const shapeP1 = getPathCoordinates(PRODUCTS[0]);
    const shapeP2 = getPathCoordinates(PRODUCTS[1]);

    const lineGenerator = d3.lineRadial<any>()
        .angle((_, i) => angleScale(i))
        .radius((d) => (d.value / maxValues[d.label]) * RADIUS)
        .curve(d3.curveLinearClosed);

    return (
        <div className="relative flex justify-center">
            <svg ref={svgRef} width={width} height={height} className="overflow-visible">
                {/* 1. Grid Levels */}
                {[0.2, 0.4, 0.6, 0.8, 1].map((tick, i) => (
                    <circle
                        key={i}
                        cx={CENTER_X}
                        cy={CENTER_Y}
                        r={RADIUS * tick}
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                    />
                ))}

                {/* 2. Axes Lines & Labels */}
                {FEATURES.map((feat, i) => {
                    const angle = angleScale(i) - Math.PI / 2;
                    const x = CENTER_X + Math.cos(angle) * RADIUS;
                    const y = CENTER_Y + Math.sin(angle) * RADIUS;

                    // Label Position
                    const labelX = CENTER_X + Math.cos(angle) * (RADIUS + 30);
                    const labelY = CENTER_Y + Math.sin(angle) * (RADIUS + 30);

                    const config = FEATURE_CONFIG[feat];

                    return (
                        <g key={feat}>
                            <line x1={CENTER_X} y1={CENTER_Y} x2={x} y2={y} stroke="#cbd5e1" strokeWidth="1" />
                            <g transform={`translate(${labelX}, ${labelY})`}>
                                <text
                                    textAnchor="middle"
                                    className="text-xs font-bold fill-gray-500 uppercase tracking-wider"
                                >
                                    {config.label}
                                </text>
                                <text
                                    y={12}
                                    textAnchor="middle"
                                    className="text-[10px] fill-gray-400 font-mono"
                                >
                                    ({config.unit})
                                </text>
                            </g>
                        </g>
                    );
                })}

                {/* 3. Product Shapes */}
                {[
                    { data: shapeP1, product: PRODUCTS[0], color: '#f59e0b' }, // Grade C
                    { data: shapeP2, product: PRODUCTS[1], color: '#10b981' }  // Grade A
                ].map((item, i) => (
                    <g
                        key={i}
                        onMouseEnter={() => setHoveredProduct(item.product.id)}
                        onMouseLeave={() => setHoveredProduct(null)}
                        className="transition-opacity duration-300 cursor-pointer"
                        style={{ opacity: hoveredProduct && hoveredProduct !== item.product.id ? 0.1 : 0.9 }}
                    >
                        <path
                            // @ts-ignore
                            d={lineGenerator(item.data)}
                            fill={item.color}
                            fillOpacity={0.2}
                            stroke={item.color}
                            strokeWidth={3}
                            transform={`translate(${CENTER_X}, ${CENTER_Y})`}
                        />
                        {/* Dots at vertices */}
                        {item.data.map((point, idx) => (
                            <circle
                                key={idx}
                                cx={point.x}
                                cy={point.y}
                                r={hoveredProduct === item.product.id ? 6 : 4}
                                fill={item.color}
                                className="transition-all duration-300"
                            >
                                <title>
                                    {point.label}: {point.value.toFixed(2)}{FEATURE_CONFIG[point.label].unit}
                                </title>
                            </circle>
                        ))}
                    </g>
                ))}
            </svg>
        </div>
    );
};

// --- Main Layout ---
const NutrientComparison: React.FC = () => {
    // Lifted state to manage hover across both list and chart
    const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);

    return (
        <section className="w-full max-w-7xl mx-auto font-serif bg-white">
            <div className="text-center mb-20">
                <h2 className="text-5xl font-bold text-gray-900 mb-6 font-sans tracking-tight">The Ingredient Illusion</h2>
                <div className="max-w-3xl mx-auto text-lg text-gray-600 leading-relaxed space-y-4">
                    <p>
                        Ingredient lists can be deceptive. Two products might list identical components—sugar, flour, salt—but
                        <span className="font-bold text-gray-900"> the proportions matter immensely.</span>
                    </p>
                    <p>
                        Without checking the <span className="bg-blue-100 text-blue-800 px-1 rounded font-bold">Nutrition Facts</span> label,
                        it is nearly impossible to gauge whether a product is nutrient-dense or empty calories.
                        Even the Nutri-Score can sometimes obscure the specific trade-offs (e.g., lower fat vs. higher sugar).
                    </p>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-16 items-start">

                {/* LEFT: The Reveal Cards */}
                <div className="space-y-8">
                    <div className="text-sm font-sans font-bold text-gray-400 uppercase tracking-widest border-b pb-2 mb-6">
                        Hover to Compare Products
                    </div>

                    {PRODUCTS.map(p => (
                        <div
                            key={p.id}
                            onMouseEnter={() => setHoveredProduct(p.id)}
                            onMouseLeave={() => setHoveredProduct(null)}
                            className={`p-8 rounded-2xl border transition-all duration-300 relative overflow-hidden group cursor-default
                                ${hoveredProduct && hoveredProduct !== p.id ? 'opacity-40 scale-95 border-gray-100' : 'border-gray-200 shadow-xl scale-100 bg-white'}
                            `}
                        >
                            {/* Grade Badge */}
                            <div className={`absolute top-0 right-0 w-20 h-20 flex items-center justify-center text-3xl font-black text-white 
                                ${p.grade === 'a' ? 'bg-[#038141]' : 'bg-[#FECB02]'} rounded-bl-full shadow-md z-10 uppercase transition-transform duration-300 group-hover:scale-110`}>
                                <span className="-mt-2 -mr-2">{p.grade}</span>
                            </div>

                            <div className="pr-12">
                                <h3 className="text-2xl font-bold text-gray-900 mb-2 font-sans">{p.name}</h3>

                                <div className="mb-6">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ingredients List</span>
                                    <div className="mt-2 text-sm text-gray-600 leading-relaxed font-serif bg-gray-50 p-4 rounded-xl border border-gray-100 italic">
                                        "{p.ingredients}"
                                    </div>
                                </div>

                                {/* Mini Stats for direct comparison */}
                                <div className="grid grid-cols-3 gap-4 border-t pt-4">
                                    <div>
                                        <div className="text-[10px] uppercase text-gray-400 font-bold">Sugar</div>
                                        <div className="text-lg font-mono font-bold text-gray-700">{p.nutrients.Sugar}g</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase text-gray-400 font-bold">Protein</div>
                                        <div className="text-lg font-mono font-bold text-gray-700">{p.nutrients.Protein}g</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase text-gray-400 font-bold">Sodium</div>
                                        <div className="text-lg font-mono font-bold text-gray-700">{p.nutrients.Sodium}g</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl">
                        <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                            <span className="text-xl">💡</span> Why the difference?
                        </h4>
                        <p className="text-blue-800 text-sm leading-relaxed">
                            Despite having the <strong>exact same ingredients list</strong>, the <span className="font-bold text-[#038141]">Grade A</span> option has
                            significantly <strong>less sugar</strong> (7g vs 13.2g) and <strong>more protein</strong>.
                            The ingredient list order is roughly similar, but the <em>ratios</em> create a completely different nutritional profile.
                        </p>
                    </div>
                </div>

                {/* RIGHT: Radar Chart */}
                <div className="lg:sticky lg:top-20 flex flex-col items-center justify-center bg-white rounded-3xl border border-gray-100 shadow-2xl p-10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#10b981] to-[#f59e0b]"></div>

                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-10">Nutrient Fingerprint (Per 100g)</h4>

                    <ComparisonRadar
                        width={500}
                        height={500}
                        hoveredProduct={hoveredProduct}
                        setHoveredProduct={setHoveredProduct}
                    />

                    <div className="flex gap-8 mt-10 w-full justify-center">
                        <div
                            className={`flex items-center gap-3 transition-opacity duration-300 ${hoveredProduct && hoveredProduct !== 'p2' ? 'opacity-30' : 'opacity-100'}`}
                            onMouseEnter={() => setHoveredProduct('p2')}
                            onMouseLeave={() => setHoveredProduct(null)}
                        >
                            <span className="w-4 h-4 rounded-full bg-[#10b981] shadow-sm ring-2 ring-white"></span>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-gray-800">Small Curd (Grade A)</span>
                                <span className="text-xs text-gray-400">Better Balance</span>
                            </div>
                        </div>
                        <div
                            className={`flex items-center gap-3 transition-opacity duration-300 ${hoveredProduct && hoveredProduct !== 'p1' ? 'opacity-30' : 'opacity-100'}`}
                            onMouseEnter={() => setHoveredProduct('p1')}
                            onMouseLeave={() => setHoveredProduct(null)}
                        >
                            <span className="w-4 h-4 rounded-full bg-[#f59e0b] shadow-sm ring-2 ring-white"></span>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-gray-800">Key Food (Grade C)</span>
                                <span className="text-xs text-gray-400">High Sugar</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
};

export default NutrientComparison;