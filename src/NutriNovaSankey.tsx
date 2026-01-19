import React, { useMemo, useState } from 'react';
import * as d3 from 'd3';

// --- Configuration ---
const COLORS_NUTRI: Record<string, string> = {
    'a': '#038141', 'b': '#85BB2F', 'c': '#FECB02', 'd': '#EE8100', 'e': '#E63E11', 'unknown': '#ccc'
};
const COLORS_NOVA: Record<string, string> = {
    '1': '#00ab41', '2': '#ffcc00', '3': '#ff6600', '4': '#d60000', 'unknown': '#ccc'
};

const LABELS_NUTRI: Record<string, string> = {
    'a': 'Grade A', 'b': 'Grade B', 'c': 'Grade C', 'd': 'Grade D', 'e': 'Grade E'
};
const LABELS_NOVA: Record<string, string> = {
    '1': 'Group 1', '2': 'Group 2', '3': 'Group 3', '4': 'Group 4'
};

// Updated Data with Most Common Category
const RAW_COUNTS = [
    { ns: 'a', nova: '1', count: 29120, category: 'Cereals' },
    { ns: 'a', nova: '2', count: 345, category: 'Fats' },
    { ns: 'a', nova: '3', count: 16137, category: 'Vegetables' },
    { ns: 'a', nova: '4', count: 16069, category: 'One-dish meals' },
    { ns: 'b', nova: '1', count: 9281, category: 'Cereals' },
    { ns: 'b', nova: '2', count: 1540, category: 'Fats' },
    { ns: 'b', nova: '3', count: 10804, category: 'One-dish meals' },
    { ns: 'b', nova: '4', count: 18724, category: 'One-dish meals' },
    { ns: 'c', nova: '1', count: 6716, category: 'Fruit juices' },
    { ns: 'c', nova: '2', count: 1229, category: 'Fats' },
    { ns: 'c', nova: '3', count: 21354, category: 'Dressings and sauces' },
    { ns: 'c', nova: '4', count: 54975, category: 'One-dish meals' },
    { ns: 'd', nova: '1', count: 2851, category: 'Fruit juices' },
    { ns: 'd', nova: '2', count: 576, category: 'Sweets' },
    { ns: 'd', nova: '3', count: 22330, category: 'Cheese' },
    { ns: 'd', nova: '4', count: 63226, category: 'Biscuits and cakes' },
    { ns: 'e', nova: '1', count: 1350, category: 'Unsweetened beverages' },
    { ns: 'e', nova: '2', count: 2312, category: 'Fats' },
    { ns: 'e', nova: '3', count: 13327, category: 'Biscuits and cakes' },
    { ns: 'e', nova: '4', count: 82413, category: 'Biscuits and cakes' },
];

export default function NutriNovaSankey() {
    // Tooltip State
    const [hoverInfo, setHoverInfo] = useState<{ x: number, y: number, data: any } | null>(null);

    const { nodesLeft, nodesRight, links, svgHeight, width } = useMemo(() => {
        // 1. Organize Data
        const counts: Record<string, { count: number, category: string }> = {};
        const nutriTotals: Record<string, number> = {};
        let totalCount = 0;

        RAW_COUNTS.forEach(d => {
            const key = `${d.ns}|${d.nova}`;
            counts[key] = { count: d.count, category: d.category };
            nutriTotals[d.ns] = (nutriTotals[d.ns] || 0) + d.count;
            totalCount += d.count;
        });

        // 2. Define Node Order
        const leftKeys = ['a', 'b', 'c', 'd', 'e'];
        const rightKeys = ['1', '2', '3', '4'];

        // 3. Dimensions (Wider and Shorter)
        const width = 1000; // Increased width
        const padding = 20;
        const nodeWidth = 20;

        // Reduced max height
        const maxContentHeight = 400;
        const scale = maxContentHeight / totalCount;

        // 4. Build Left Nodes (Nutri-Score)
        let currentY = 0;
        const nodesLeft = leftKeys.map(key => {
            const total = rightKeys.reduce((sum, rKey) => sum + (counts[`${key}|${rKey}`]?.count || 0), 0);
            const height = total * scale;
            const node = {
                key,
                x: 0,
                y: currentY,
                width: nodeWidth,
                height,
                color: COLORS_NUTRI[key],
                label: LABELS_NUTRI[key],
                total
            };
            currentY += height + padding;
            return node;
        });

        // 5. Build Right Nodes (NOVA)
        currentY = 0;
        const nodesRight = rightKeys.map(key => {
            const total = leftKeys.reduce((sum, lKey) => sum + (counts[`${lKey}|${key}`]?.count || 0), 0);
            const height = total * scale;
            const node = {
                key,
                x: width - nodeWidth,
                y: currentY,
                width: nodeWidth,
                height,
                color: COLORS_NOVA[key],
                label: LABELS_NOVA[key],
                total
            };
            currentY += height + padding;
            return node;
        });

        const svgHeight = Math.max(nodesLeft[nodesLeft.length-1].y + nodesLeft[nodesLeft.length-1].height, nodesRight[nodesRight.length-1].y + nodesRight[nodesRight.length-1].height);

        // 6. Build Links
        const links: any[] = [];
        const leftOffsets: Record<string, number> = {};
        const rightOffsets: Record<string, number> = {};
        leftKeys.forEach(k => leftOffsets[k] = 0);
        rightKeys.forEach(k => rightOffsets[k] = 0);

        leftKeys.forEach(lKey => {
            rightKeys.forEach(rKey => {
                const data = counts[`${lKey}|${rKey}`];
                if (data && data.count > 0) {
                    const weight = data.count * scale;

                    const sourceNode = nodesLeft.find(n => n.key === lKey)!;
                    const targetNode = nodesRight.find(n => n.key === rKey)!;

                    const sourceY = sourceNode.y + leftOffsets[lKey];
                    const targetY = targetNode.y + rightOffsets[rKey];

                    // Calculations for Tooltip
                    // % of the Source Grade (e.g. 50% of Grade A products are Nova 1)
                    const percentOfGrade = (data.count / nutriTotals[lKey]) * 100;

                    // Custom Ribbon Path
                    const curvature = 0.5;
                    const xi = d3.interpolateNumber(nodeWidth, width - nodeWidth);
                    const x2 = xi(curvature);
                    const x3 = xi(1 - curvature);

                    const y0_top = sourceY;
                    const y0_bot = sourceY + weight;
                    const y1_top = targetY;
                    const y1_bot = targetY + weight;

                    const ribbonPath = `
                        M ${nodeWidth} ${y0_top}
                        C ${x2} ${y0_top}, ${x3} ${y1_top}, ${width - nodeWidth} ${y1_top}
                        L ${width - nodeWidth} ${y1_bot}
                        C ${x3} ${y1_bot}, ${x2} ${y0_bot}, ${nodeWidth} ${y0_bot}
                        Z
                    `;

                    // Animation Path
                    const flowPath = `
                        M ${nodeWidth} ${sourceY + weight/2}
                        C ${x2} ${sourceY + weight/2}, ${x3} ${targetY + weight/2}, ${width - nodeWidth} ${targetY + weight/2}
                    `;

                    links.push({
                        id: `${lKey}-${rKey}`,
                        sourceColor: COLORS_NUTRI[lKey],
                        targetColor: COLORS_NOVA[rKey],
                        sourceLabel: LABELS_NUTRI[lKey],
                        targetLabel: LABELS_NOVA[rKey],
                        category: data.category,
                        percent: percentOfGrade.toFixed(1),
                        path: ribbonPath,
                        flowPath: flowPath,
                        weight: weight,
                        count: data.count
                    });

                    leftOffsets[lKey] += weight;
                    rightOffsets[rKey] += weight;
                }
            });
        });

        return { nodesLeft, nodesRight, links, svgHeight, width };
    }, []);

    // Extra margin for labels
    const labelMargin = 120;

    return (
        <div className="w-full max-w-7xl mx-auto py-2 relative">
            <h3 className="font-sans text-2xl font-bold text-gray-900 mb-2">Nutrient Flow</h3>
            <p className="text-gray-500 mb-8">
                Tracing how products flow from their <strong>Nutritional Grade</strong> (Left) to their <strong>Processing Level</strong> (Right).
            </p>

            <div className="w-full">
                <svg width="100%" height={svgHeight + 40} viewBox={`-${labelMargin} 0 ${width + (labelMargin * 2)} ${svgHeight}`} className="overflow-visible">
                    <defs>
                        {links.map((link) => (
                            <linearGradient id={`grad-${link.id}`} key={link.id} gradientUnits="userSpaceOnUse" x1="0" x2={width} y1="0" y2="0">
                                <stop offset="0%" stopColor={link.sourceColor} />
                                <stop offset="100%" stopColor={link.targetColor} />
                            </linearGradient>
                        ))}
                    </defs>

                    {/* LINKS */}
                    <g className="mix-blend-multiply opacity-80">
                        {links.map((link) => (
                            <g key={link.id}
                               onMouseEnter={(e) => setHoverInfo({
                                   x: e.clientX,
                                   y: e.clientY,
                                   data: link
                               })}
                               onMouseMove={(e) => setHoverInfo(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                               onMouseLeave={() => setHoverInfo(null)}
                            >
                                {/* Base Ribbon */}
                                <path
                                    d={link.path}
                                    fill={`url(#grad-${link.id})`}
                                    opacity={0.6}
                                    className="hover:opacity-90 transition-opacity duration-300 cursor-pointer"
                                />

                                {/* Animated Wave Flow */}
                                {link.weight > 3 && (
                                    <path
                                        d={link.flowPath}
                                        fill="none"
                                        stroke="white"
                                        strokeWidth={Math.max(1, link.weight * 0.4)}
                                        strokeDasharray="10 20"
                                        strokeLinecap="round"
                                        strokeOpacity={0.4}
                                        className="animate-flow pointer-events-none"
                                    />
                                )}
                            </g>
                        ))}
                    </g>

                    {/* NODES LEFT */}
                    <g>
                        {nodesLeft.map(node => (
                            <g key={node.key} transform={`translate(${node.x}, ${node.y})`}>
                                <rect width={node.width} height={node.height} fill={node.color} rx={4} />
                                <text
                                    x={-10}
                                    y={node.height / 2}
                                    dy="0.35em"
                                    textAnchor="end"
                                    className="font-bold text-sm fill-gray-800"
                                >
                                    {node.label}
                                </text>
                                <text
                                    x={-10}
                                    y={node.height / 2 + 16}
                                    textAnchor="end"
                                    className="text-xs fill-gray-500"
                                >
                                    {node.total.toLocaleString()}
                                </text>
                            </g>
                        ))}
                    </g>

                    {/* NODES RIGHT */}
                    <g>
                        {nodesRight.map(node => (
                            <g key={node.key} transform={`translate(${node.x}, ${node.y})`}>
                                <rect width={node.width} height={node.height} fill={node.color} rx={4} />
                                <text
                                    x={node.width + 10}
                                    y={node.height / 2}
                                    dy="0.35em"
                                    textAnchor="start"
                                    className="font-bold text-sm fill-gray-800"
                                >
                                    {node.label}
                                </text>
                                <text
                                    x={node.width + 10}
                                    y={node.height / 2 + 16}
                                    textAnchor="start"
                                    className="text-xs fill-gray-500"
                                >
                                    {node.total.toLocaleString()}
                                </text>
                            </g>
                        ))}
                    </g>
                </svg>
            </div>

            {/* Custom Tooltip */}
            {hoverInfo && (
                <div
                    className="fixed z-50 bg-white/95 backdrop-blur p-4 rounded-lg shadow-xl border border-gray-200 pointer-events-none text-sm max-w-[280px]"
                    style={{ left: hoverInfo.x + 15, top: hoverInfo.y + 15 }}
                >
                    <div className="font-bold text-gray-900 mb-1">
                        {hoverInfo.data.sourceLabel} <span className="text-gray-400 mx-1">→</span> {hoverInfo.data.targetLabel}
                    </div>
                    <div className="text-xs text-gray-500 mb-3 pb-2 border-b border-gray-100">
                        <span className="font-bold text-gray-800 text-sm">{hoverInfo.data.percent}%</span> of {hoverInfo.data.sourceLabel} products
                    </div>

                    <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-500 text-xs">Count</span>
                        <span className="font-mono font-bold text-gray-700">{hoverInfo.data.count.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-xs">Most Common</span>
                        <span className="font-bold text-blue-600 text-xs">{hoverInfo.data.category}</span>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes flow {
                    from { stroke-dashoffset: 60; }
                    to { stroke-dashoffset: 0; }
                }
                .animate-flow {
                    /* Slower animation for a relaxed wave effect */
                    animation: flow 2s linear infinite; 
                }
            `}</style>
        </div>
    );
}