import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';

// --- Types ---
interface ScatterProps {
    data: any[];
    xAccessor: (d: any) => number;
    yAccessor: (d: any) => number;
    colorAccessor: (d: any) => string;
    selectedIndices: Set<number>;
    onSelectionChange: (indices: Set<number>) => void;
    onHoverChange: (d: any | null, x: number, y: number) => void;

    // NEW: Shared Zoom Props
    zoomTransform: d3.ZoomTransform;
    onZoomChange: (t: d3.ZoomTransform) => void;

    interactionMode: 'zoom' | 'select';
    width?: number;
    height?: number;
}

const D3Scatter: React.FC<ScatterProps> = ({
                                               data,
                                               xAccessor,
                                               yAccessor,
                                               colorAccessor,
                                               selectedIndices,
                                               onSelectionChange,
                                               onHoverChange,
                                               zoomTransform, // <--- Received from parent
                                               onZoomChange,  // <--- Callback to parent
                                               interactionMode,
                                               width = 400,
                                               height = 400
                                           }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    // --- 1. Scales & Quadtree ---
    const { xScale, yScale, quadtree } = useMemo(() => {
        if (data.length === 0) return { xScale: null, yScale: null, quadtree: null };

        const xExtent = d3.extent(data, xAccessor) as [number, number];
        const yExtent = d3.extent(data, yAccessor) as [number, number];

        const xPad = (xExtent[1] - xExtent[0]) * 0.05;
        const yPad = (yExtent[1] - yExtent[0]) * 0.05;

        const xScale = d3.scaleLinear().domain([xExtent[0] - xPad, xExtent[1] + xPad]).range([0, width]);
        const yScale = d3.scaleLinear().domain([yExtent[0] - yPad, yExtent[1] + yPad]).range([height, 0]);

        const quadtree = d3.quadtree()
            .x(d => xScale(xAccessor(d)))
            .y(d => yScale(yAccessor(d)))
            .addAll(data);

        return { xScale, yScale, quadtree };
    }, [data, width, height]);

    // --- 2. Render Loop (Canvas) ---
    const draw = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !xScale || !yScale) return;

        // Use the prop directly
        const t = zoomTransform;

        ctx.save();
        ctx.clearRect(0, 0, width, height);

        ctx.translate(t.x, t.y);
        ctx.scale(t.k, t.k);

        const pointSize = 3 / t.k;

        // Draw Unselected
        data.forEach((d, i) => {
            const isSelected = selectedIndices.has(i);
            const hasSelection = selectedIndices.size > 0;

            ctx.globalAlpha = hasSelection && !isSelected ? 0.1 : 0.6;

            if (!isSelected) {
                ctx.beginPath();
                ctx.fillStyle = colorAccessor(d);
                ctx.arc(xScale(xAccessor(d)), yScale(yAccessor(d)), pointSize, 0, 2 * Math.PI);
                ctx.fill();
            }
        });

        // Draw Selected
        if (selectedIndices.size > 0) {
            ctx.globalAlpha = 1;
            data.forEach((d, i) => {
                if (selectedIndices.has(i)) {
                    ctx.beginPath();
                    ctx.fillStyle = colorAccessor(d);
                    ctx.strokeStyle = '#333';
                    ctx.lineWidth = 0.5 / t.k;
                    ctx.arc(xScale(xAccessor(d)), yScale(yAccessor(d)), pointSize, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();
                }
            });
        }

        ctx.restore();
    };

    // Draw whenever props change (including zoomTransform)
    useEffect(() => {
        draw();
    }, [data, selectedIndices, zoomTransform, width, height]);


    // --- 3. Interaction Handling (SVG) ---
    useEffect(() => {
        if (!svgRef.current || !xScale || !yScale || !quadtree) return;

        const svg = d3.select(svgRef.current);

        svg.on(".zoom", null);
        svg.selectAll(".brush").remove();
        svg.on("dblclick", null);

        // -- Shared Hover --
        const handleMouseMove = (event: any) => {
            const [mx, my] = d3.pointer(event, svgRef.current);
            const t = zoomTransform;

            const tx = (mx - t.x) / t.k;
            const ty = (my - t.y) / t.k;

            const searchRadius = 10 / t.k;
            const closest = quadtree.find(tx, ty, searchRadius);

            if (closest) {
                onHoverChange(closest, event.clientX, event.clientY);
            } else {
                onHoverChange(null, 0, 0);
            }
        };

        // --- MODE: BOX ZOOM ---
        if (interactionMode === 'zoom') {
            const zoomBrush = d3.brush()
                .extent([[0, 0], [width, height]])
                .keyModifiers(false)
                .on("end", (event) => {
                    if (!event.selection) return;

                    const [[x0, y0], [x1, y1]] = event.selection;
                    svg.select(".brush").call(d3.brush().move as any, null);

                    if (Math.abs(x1 - x0) < 5 || Math.abs(y1 - y0) < 5) return;

                    // Calculate New Transform locally
                    const k = Math.min(width / (x1 - x0), height / (y1 - y0));
                    const currentT = zoomTransform;

                    const newK = currentT.k * k;
                    const newX = currentT.x * k - x0 * k;
                    const newY = currentT.y * k - y0 * k;

                    // Send to Parent (LinkedD3Dashboard)
                    onZoomChange(d3.zoomIdentity.translate(newX, newY).scale(newK));
                });

            const brushGroup = svg.append("g")
                .attr("class", "brush")
                .call(zoomBrush);

            brushGroup.selectAll("rect").style("cursor", "zoom-in");
            brushGroup.select(".overlay").on("mousemove", handleMouseMove);

            // Double Click to Reset
            svg.on("dblclick", () => {
                onZoomChange(d3.zoomIdentity);
            });

        }
        // --- MODE: SELECT ---
        else {
            const selectBrush = d3.brush()
                .extent([[0, 0], [width, height]])
                .keyModifiers(false)
                .on("end", (event) => {
                    if (!event.selection) {
                        onSelectionChange(new Set());
                        return;
                    }
                    const [[x0, y0], [x1, y1]] = event.selection;
                    const t = zoomTransform; // Use prop

                    const rx0 = (x0 - t.x) / t.k;
                    const ry0 = (y0 - t.y) / t.k;
                    const rx1 = (x1 - t.x) / t.k;
                    const ry1 = (y1 - t.y) / t.k;

                    const newSelection = new Set<number>();
                    quadtree.visit((node, x1q, y1q, x2q, y2q) => {
                        if (!node.length) {
                            do {
                                // @ts-ignore
                                const d = node.data;
                                const dx = xScale(xAccessor(d));
                                const dy = yScale(yAccessor(d));
                                if (dx >= rx0 && dx < rx1 && dy >= ry0 && dy < ry1) {
                                    newSelection.add(data.indexOf(d));
                                }
                                // @ts-ignore
                            } while (node = node.next);
                        }
                        return x1q >= rx1 || x2q < rx0 || y1q >= ry1 || y2q < ry0;
                    });

                    onSelectionChange(newSelection);
                    svg.select(".brush").call(d3.brush().move as any, null);
                });

            const brushGroup = svg.append("g")
                .attr("class", "brush")
                .call(selectBrush);

            brushGroup.selectAll("rect").style("cursor", "crosshair");
            brushGroup.select(".overlay").on("mousemove", handleMouseMove);
        }
    }, [interactionMode, width, height, xScale, yScale, zoomTransform]); // Add zoomTransform as dependency

    return (
        <div style={{ position: 'relative', width, height, overflow: 'hidden' }}>
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                style={{ position: 'absolute', top: 0, left: 0 }}
            />
            <svg
                ref={svgRef}
                width={width}
                height={height}
                style={{ position: 'absolute', top: 0, left: 0 }}
            />
        </div>
    );
};

export default D3Scatter;