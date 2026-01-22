import {useEffect, useRef, useState} from "react";
import * as d3 from "d3";

/* ---------- TYPES ---------- */
interface FoodData {
    product_name?: string;
    nutriscore_grade?: string;
    nutriscore_score: number;
    nova_group?: string;
    "energy-kcal_100g": number;
    fat_100g: number;
    carbohydrates_100g: number;
    fiber_100g: number;
    proteins_100g: number;
    sodium_100g: number;

    [key: string]: string | number | undefined;
}

/* ---------- CONFIG ---------- */
const NUTRIENTS = [
    "energy-kcal_100g",
    "fat_100g",
    "carbohydrates_100g",
    "fiber_100g",
    "proteins_100g",
    "sodium_100g",
] as const;

type NutrientKey = typeof NUTRIENTS[number];

const NUTRIENT_LABELS: Record<NutrientKey, string> = {
    "energy-kcal_100g": "Energy",
    "fat_100g": "Fat",
    "carbohydrates_100g": "Carbs",
    "fiber_100g": "Fiber",
    "proteins_100g": "Protein",
    "sodium_100g": "Sodium",
};

const NUTRIENT_UNITS: Record<NutrientKey, string> = {
    "energy-kcal_100g": "kcal",
    "fat_100g": "g",
    "carbohydrates_100g": "g",
    "fiber_100g": "g",
    "proteins_100g": "g",
    "sodium_100g": "g",
};

/* ---------- Nutri-Score colors ---------- */
const nutriColor = d3.scaleOrdinal<string, string>()
    .domain(["a", "b", "c", "d", "e"])
    .range([
        "#1a9850", // A
        "#91cf60", // B
        "#fee08b", // C
        "#fc8d59", // D
        "#d73027", // E
    ]);

const NUTRI_GRADES = ["A", "B", "C", "D", "E"];

const CELL_SIZE = 130;
const PADDING = 100;
const POINT_RADIUS = 2;

/* ---------- COMPONENT ---------- */
export default function ScatterMatrix() {
    const [data, setData] = useState<FoodData[]>([]);
    const [hoveredPoint, setHoveredPoint] = useState<FoodData | null>(null);
    const [mousePos, setMousePos] = useState({x: 0, y: 0});
    const svgRef = useRef<SVGSVGElement>(null);
    const [selectedPoint, setSelectedPoint] = useState<FoodData | null>(null);

    /* ---------- Load CSV ---------- */
    useEffect(() => {
        d3.csv("/filtered_milk_and_dairy_products.csv").then(raw => {
            const parsed: FoodData[] = raw.map(d => ({
                ...d,
                nutriscore_score: +d.nutriscore_score!,
                "energy-kcal_100g": +d["energy-kcal_100g"]!,
                "fat_100g": +d["fat_100g"]!,
                "carbohydrates_100g": +d["carbohydrates_100g"]!,
                "fiber_100g": +d["fiber_100g"]!,
                "proteins_100g": +d["proteins_100g"]!,
                "sodium_100g": +d["sodium_100g"]!,
            })).filter(d =>
                NUTRIENTS.every(n => Number.isFinite(d[n]))
            );
            const sampled = d3.shuffle(
                parsed.filter(d =>
                    d.fiber_100g <= 12 &&
                    d.proteins_100g <= 60 &&
                    d.sodium_100g <= 4
                )
            ).slice(0, 10_000);

            setData(sampled);
        });
    }, []);

    /* ---------- Draw scatter matrix ---------- */
    useEffect(() => {
        if (!data.length || !svgRef.current) return;

        const CELL_GAP = 12;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const n = NUTRIENTS.length;
        const matrixSize = n * CELL_SIZE + (n - 1) * CELL_GAP;
        const width = matrixSize + PADDING * 2;
        const height = matrixSize + PADDING * 2;

        svg.attr("width", width).attr("height", height);

        const g = svg.append("g")
            .attr("transform", `translate(${PADDING}, ${PADDING})`);

        /* ---------- SEPARATE SCALES (CRITICAL FIX) ---------- */
        const xScales: Record<NutrientKey, d3.ScaleLinear<number, number>> = {} as any;
        const yScales: Record<NutrientKey, d3.ScaleLinear<number, number>> = {} as any;

        NUTRIENTS.forEach(nutrient => {
            const extent = d3.extent(data.map(d => d[nutrient] as number)) as [number, number];

            // ✅ X axis: ascending left → right
            xScales[nutrient] = d3.scaleLinear()
                .domain(extent)
                .range([0, CELL_SIZE])
                .nice();

            // ✅ Y axis: inverted top → bottom
            yScales[nutrient] = d3.scaleLinear()
                .domain(extent)
                .range([CELL_SIZE, 0])
                .nice();
        });

        /* ---------- CELLS ---------- */
        NUTRIENTS.forEach((yNutrient, i) => {
            NUTRIENTS.forEach((xNutrient, j) => {

                const cellG = g.append("g")
                    .attr(
                        "transform",
                        `translate(${j * (CELL_SIZE + CELL_GAP)}, ${i * (CELL_SIZE + CELL_GAP)})`
                    );

                cellG.append("rect")
                    .attr("width", CELL_SIZE)
                    .attr("height", CELL_SIZE)
                    .attr("fill", "none")
                    .attr("stroke", "#ddd");

                /* ---------- DIAGONAL: HISTOGRAM ---------- */
                if (i === j) {
                    const values = data.map(d => d[xNutrient] as number);

                    const xHistScale = d3.scaleLinear()
                        .domain(xScales[xNutrient].domain() as [number, number])
                        .range([0, CELL_SIZE])
                        .nice();

                    const bins = d3.bin()
                        .domain(xHistScale.domain() as [number, number])
                        .thresholds(25)(values);

                    const yHistScale = d3.scaleLinear()
                        .domain([0, d3.max(bins, d => d.length)!])
                        .range([CELL_SIZE, 0]);

                    const histG = cellG.append("g");

                    histG.selectAll("rect")
                        .data(bins)
                        .enter()
                        .append("rect")
                        .attr("x", d => xHistScale(d.x0!))
                        .attr("y", d => yHistScale(d.length))
                        .attr("width", d => Math.max(1, xHistScale(d.x1!) - xHistScale(d.x0!)))
                        .attr("height", d => CELL_SIZE - yHistScale(d.length))
                        .attr("fill", "#9e9e9e")
                        .attr("opacity", 0.75);

                    histG.raise();

                    // Histogram axes (bottom + left only)
                    if (i === n - 1) {
                        cellG.append("g")
                            .attr("transform", `translate(0, ${CELL_SIZE})`)
                            .call(d3.axisBottom(xHistScale).ticks(5))
                            .selectAll("text")
                            .style("font-size", "10px");
                    }

                    if (j === 0) {
                        cellG.append("g")
                            .call(d3.axisLeft(yHistScale).ticks(5))
                            .selectAll("text")
                            .style("font-size", "10px");
                    }
                }

                /* ---------- OFF-DIAGONAL: SCATTER ---------- */
                if (i !== j) {
                    const xScale = xScales[xNutrient]; // ✅ fixed
                    const yScale = yScales[yNutrient]; // ✅ fixed

                    cellG.selectAll("circle")
                        .data(data)
                        .enter()
                        .append("circle")
                        .attr("cx", d => xScale(d[xNutrient] as number))
                        .attr("cy", d => yScale(d[yNutrient] as number))
                        .attr("r", POINT_RADIUS)
                        .attr("fill", d =>
                            nutriColor((d.nutriscore_grade || "").toLowerCase()) || "#999"
                        )
                        .attr("opacity", d =>
                            !selectedPoint || d === selectedPoint ? 1 : 0.1
                        )
                        .attr("stroke", d =>
                            d === selectedPoint ? "#000" : "none"
                        )
                        .attr("stroke-width", d =>
                            d === selectedPoint ? 1.5 : 0
                        )
                        .on("mouseover", (event, d) => {
                            d3.select(event.currentTarget)
                                .attr("r", POINT_RADIUS * 2)
                                .attr("stroke", "#000");

                            setHoveredPoint(d);
                            setMousePos({x: event.clientX, y: event.clientY});
                        })
                        .on("mouseout", (event, d) => {
                            d3.select(event.currentTarget)
                                .attr("r", POINT_RADIUS)
                                .attr("stroke", d === selectedPoint ? "#000" : "none");

                            setHoveredPoint(null);
                        })
                        .on("click", (_, d) => setSelectedPoint(d));

                    // Scatter axes
                    if (i === n - 1) {
                        cellG.append("g")
                            .attr("transform", `translate(0, ${CELL_SIZE})`)
                            .call(d3.axisBottom(xScale).ticks(5))
                            .selectAll("text")
                            .style("font-size", "10px");
                    }

                    if (j === 0) {
                        cellG.append("g")
                            .call(d3.axisLeft(yScale).ticks(5))
                            .selectAll("text")
                            .style("font-size", "10px");
                    }
                }

                /* ---------- AXIS LABELS ---------- */
                if (i === n - 1) {
                    cellG.append("text")
                        .attr("x", CELL_SIZE / 2)
                        .attr("y", CELL_SIZE + 45)
                        .attr("text-anchor", "middle")
                        .style("font-size", "12px")
                        .style("font-weight", "bold")
                        .text(`${NUTRIENT_LABELS[xNutrient]} (${NUTRIENT_UNITS[xNutrient]})`);
                }

                if (j === 0) {
                    cellG.append("text")
                        .attr("x", -40)
                        .attr("y", CELL_SIZE / 2)
                        .attr("text-anchor", "end")
                        .attr("dominant-baseline", "middle")
                        .style("font-size", "12px")
                        .style("font-weight", "bold")
                        .text(`${NUTRIENT_LABELS[yNutrient]} (${NUTRIENT_UNITS[yNutrient]})`);
                }
            });
        });

    }, [data, selectedPoint]);


    if (!data.length) return <p>Loading data…</p>;

    return (

        <div
            style={{
                padding: "1rem",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
            }}
        >
            {/* Text block aligned with plot */}
            <div
                style={{
                    maxWidth: "1200px",
                    marginBottom: "0.3rem",
                    textAlign: "justify",
                }}
                className="text-lg text-gray-900 font-medium"
            >
                <p style={{marginBottom: "0.4rem"}}>
                    Milk and dairy products are far from having uniform nutritional profiles,
                    varying with small differences in nutrient content and processing levels.
                    Energy is highly correlated with fat, while carbohydrates
                    and sugars separate plain milk and yogurts from sweetened products and
                    desserts. Higher fat and sodium content often align with
                    poorer Nutri-Scores, corresponding to more processed items. Fiber remains
                    consistently low across most dairy items, highlighting a structural
                    nutritional limitation of the category. Protein varies more widely, with
                    some products offering high protein without excessive energy or fat.
                </p>
                <br/>
                <p>
                    Each point on the plot represents an individual product and lets you dive
                    deeper into its Nutri-Score, Nutri-Grade, NOVA group, and detailed nutrient
                    composition. The histograms along the diagonal show the univariate distribution of each nutrient.
                </p>
            </div>

            {/* Plot */}
            <div
                style={{
                    position: "relative",
                    display: "inline-block",
                    margin: "0 auto",
                }}
            >
                <svg ref={svgRef}/>


                {/* Legend */}
                <div
                    style={{
                        position: "absolute",
                        top: PADDING,              // aligns with top of matrix
                        left: `calc(95%)`, // very close to plot
                        padding: "1rem",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        background: "white",
                        minWidth: "150px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
                    }}
                >
                    <h3 style={{margin: "0 0 0.5rem 0", fontSize: "1rem"}}>
                        Nutri-Score Grade
                    </h3>

                    {NUTRI_GRADES.map(grade => (
                        <div
                            key={grade}
                            style={{display: "flex", alignItems: "center", marginBottom: "0.5rem"}}
                        >
                            <div
                                style={{
                                    width: "14px",
                                    height: "14px",
                                    borderRadius: "50%",
                                    backgroundColor: nutriColor(grade.toLowerCase()),
                                    marginRight: "0.5rem",
                                    border: "1px solid #999"
                                }}
                            />
                            <span style={{fontSize: "0.9rem", fontWeight: "bold"}}>
          {grade}
        </span>
                        </div>
                    ))}
                </div>
            </div>


            {/* Tooltip with Pie Chart */}
            {hoveredPoint && (
                <div
                    style={{
                        position: "fixed",
                        left: mousePos.x + 10,
                        top: mousePos.y + 10,
                        background: "white",
                        border: "2px solid #333",
                        borderRadius: "6px",
                        padding: "16px",
                        fontSize: "14px",
                        pointerEvents: "none",
                        zIndex: 1000,
                        maxWidth: "450px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
                    }}
                >
                    <div style={{display: "flex", gap: "20px"}}>
                        {/* Info Section */}
                        <div style={{flex: 1}}>
                            <strong style={{fontSize: "15px"}}>{hoveredPoint.product_name || "Unknown product"}</strong><br/>
                            <div style={{
                                marginTop: "8px",
                                paddingTop: "8px",
                                borderTop: "1px solid #eee",
                                lineHeight: "1.6"
                            }}>
                                <div>Nutri-Score: <strong>{hoveredPoint.nutriscore_grade?.toUpperCase() || "N/A"}</strong>
                                </div>
                                <div>Nutri-Score: <strong>{hoveredPoint.nutriscore_score}</strong></div>
                                <div>NOVA Group: <strong>{hoveredPoint.nova_group || "N/A"}</strong></div>
                                <div>Energy: <strong>{hoveredPoint["energy-kcal_100g"].toFixed(0)} kcal</strong>/100g
                                </div>

                            </div>
                        </div>

                        {/* Pie Chart */}
                        <div>
                            <PieChart data={hoveredPoint}/>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ---------- PIE CHART COMPONENT ---------- */
function PieChart({data}: { data: FoodData }) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        // Calculate nutrients (excluding energy and Others)
        const nutrients = [
            {name: "Fat", value: data["fat_100g"] as number, unit: "g"},
            {name: "Carbs", value: data["carbohydrates_100g"] as number, unit: "g"},
            {name: "Fiber", value: data["fiber_100g"] as number, unit: "g"},
            {name: "Protein", value: data["proteins_100g"] as number, unit: "g"},
            {name: "Sodium", value: data["sodium_100g"] as number, unit: "g"},
        ];

        const validNutrients = nutrients.filter(n => n.value > 0);

        const width = 200;
        const height = 200;
        const radius = Math.min(width, height) / 2 - 15;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const g = svg.append("g")
            .attr("transform", `translate(${width / 2}, ${height / 2})`);

        const color = d3.scaleOrdinal<string>()
            .domain(validNutrients.map(d => d.name))
            .range(["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00"]);

        const pie = d3.pie<typeof validNutrients[0]>()
            .value(d => d.value)
            .sort(null);

        const arc = d3.arc<d3.PieArcDatum<typeof validNutrients[0]>>()
            .innerRadius(0)
            .outerRadius(radius);

        const arcs = g.selectAll("arc")
            .data(pie(validNutrients))
            .enter()
            .append("g");

        arcs.append("path")
            .attr("d", arc)
            .attr("fill", d => color(d.data.name))
            .attr("stroke", "white")
            .attr("stroke-width", 2);

        // Add legend below pie
        const legend = svg.append("g")
            .attr("transform", `translate(5, ${height - 20})`);

        validNutrients.forEach((n, i) => {
            const legendRow = legend.append("g")
                .attr("transform", `translate(0, ${i * 14})`);

            legendRow.append("rect")
                .attr("width", 10)
                .attr("height", 10)
                .attr("fill", color(n.name));

            legendRow.append("text")
                .attr("x", 14)
                .attr("y", 9)
                .style("font-size", "11px")
                .text(`${n.name}: ${n.value.toFixed(1)}${n.unit}`);
        });

    }, [data]);

    return <svg ref={svgRef} width={200} height={260}/>;
}


