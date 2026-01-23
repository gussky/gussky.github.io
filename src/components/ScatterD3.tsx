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
        "#f4b400", // C
        "#fc8d59", // D
        "#d73027", // E
    ]);

const NUTRI_GRADES = ["A", "B", "C", "D", "E"];

const CELL_SIZE = 150;
const PADDING = 150;
const POINT_RADIUS = 2;

/* ---------- COMPONENT ---------- */
export default function ScatterMatrix() {
    const [data, setData] = useState<FoodData[]>([]);
    const [selectedPoint, setSelectedPoint] = useState<FoodData | null>(null);
    const [mousePos, setMousePos] = useState({x: 0, y: 0});
    const svgRef = useRef<SVGSVGElement>(null);


    /* ---------- Load CSV ---------- */
    useEffect(() => {
        d3.csv("/filtered_milk_and_dairy_products.csv").then(raw => {
            const parsed: FoodData[] = raw.map((d, idx) => ({
                ...d,
                _id: idx,
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
            ).slice(0, 5000);

            setData(sampled);
        });
    }, []);

    /* ---------- Draw scatter matrix ---------- */
    useEffect(() => {
        if (!data.length || !svgRef.current) return;

        const CELL_GAP = 12;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        // click anywhere on SVG to unselect
        svg.on("click", () => setSelectedPoint(null));

        const n = NUTRIENTS.length;
        const matrixSize = n * CELL_SIZE + (n - 1) * CELL_GAP;
        const width = matrixSize + PADDING * 2;
        const height = matrixSize + PADDING * 2;

        svg.attr("width", width).attr("height", height);
        svg.append("text")
  .attr("x", width / 2)
  .attr("y", PADDING / 2)
  .attr("text-anchor", "middle")
  .style("font-size", "18px")
  .style("font-weight", "bold")
  .text("Nutrient Scatter Plot Matrix (Milk & Dairy Products)");


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
                        .attr("data-id", d => (d as any)._id)
                        .attr("cx", d => xScale(d[xNutrient] as number))
                        .attr("cy", d => yScale(d[yNutrient] as number))
                        .attr("r", POINT_RADIUS)
                        

                        .attr("fill", d =>
                            nutriColor((d.nutriscore_grade || "").toLowerCase()) || "#999"
                        )
                        .attr("opacity", 1)
                        .attr("stroke", "none")
                        .attr("stroke-width", 0)
                        .on("click", (event, d) => {
  event.stopPropagation();
  const svg = d3.select(svgRef.current);

  const id = (d as any)._id;
  const isSelected = svg.select(`circle[data-id="${id}"]`).classed("selected");

  // clear previous selection
  svg.selectAll("circle.selected")
    .classed("selected", false)
    .attr("r", POINT_RADIUS);

  if (isSelected) {
    // unselect
    svg.classed("has-selection", false);
    setSelectedPoint(null);
  } else {
    // select
    svg.classed("has-selection", true);
    svg.selectAll(`circle[data-id="${id}"]`)
      .classed("selected", true)
      .attr("r", POINT_RADIUS * 2);
    setSelectedPoint(d);
    setMousePos({ x: event.clientX, y: event.clientY });
  }
});


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

    }, [data]);
const prevIdRef = useRef<number | null>(null);

useEffect(() => {
  if (!svgRef.current) return;
  const svg = d3.select(svgRef.current);

  const prevId = prevIdRef.current;
  const nextId = selectedPoint ? (selectedPoint as any)._id as number : null;

  // remove highlight from previously selected circles only
  if (prevId !== null) {
    svg.selectAll(`circle[data-id="${prevId}"]`)
      .classed("selected", false)
      .attr("r", POINT_RADIUS);
  }

  // toggle global dimming with ONE class on the svg
  svg.classed("has-selection", nextId !== null);

  // add highlight to newly selected circles only
  if (nextId !== null) {
    svg.selectAll(`circle[data-id="${nextId}"]`)
      .classed("selected", true)
      .attr("r", POINT_RADIUS * 2);
  }

  prevIdRef.current = nextId;
}, [selectedPoint]);



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
                    Each point on the plot represents an individual product and selecting it and lets you dive
                    deeper into its Nutri-Grade, Nutri-Score, and detailed nutrient
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
              <style>{`
  svg.has-selection circle { opacity: 0.1; }
  svg.has-selection circle.selected { opacity: 1; stroke: #000; stroke-width: 1.5; }
`}</style>

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


            {/* Tooltip with Bar Chart */}
            {selectedPoint && (
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
                            <strong style={{fontSize: "15px"}}>{selectedPoint.product_name || "Unknown product"}</strong><br/>
                            <div style={{
                                marginTop: "8px",
                                paddingTop: "8px",
                                borderTop: "1px solid #eee",
                                lineHeight: "1.6"
                            }}>
                                <div>Nutri-Grade: <strong>{selectedPoint.nutriscore_grade?.toUpperCase() || "N/A"}</strong>
                                </div>
                                <div>Nutri-Score: <strong>{selectedPoint.nutriscore_score}</strong></div>

                            </div>
                        </div>

                        {/* Bar Chart */}
                        <div style={{textAlign: "center"}}>
                            <div
                                style={{
                                    fontWeight: 600,
                                    fontSize: "13px",
                                    marginBottom: "6px"
                                }}
                            >
                                Nutrient Composition of Product
                            </div>
                            <BarChart data={selectedPoint}/>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

/* ---------- BAR CHART COMPONENT ---------- */
function BarChart({data}: { data: FoodData }) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        const nutrients = [
            {name: "Fat", value: data["fat_100g"] as number, unit: "g"},
            {name: "Carbs", value: data["carbohydrates_100g"] as number, unit: "g"},
            {name: "Fiber", value: data["fiber_100g"] as number, unit: "g"},
            {name: "Protein", value: data["proteins_100g"] as number, unit: "g"},
            {name: "Sodium", value: data["sodium_100g"] as number, unit: "g"},
        ].filter(n => Number.isFinite(n.value));

        const width = 300;
        const height = 260;

        const margin = {top: 10, right: 10, bottom: 10, left: 90};
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        const x = d3.scaleLinear()
            .domain([0, d3.max(nutrients, d => d.value) || 1])
            .range([0, innerW])
            .nice();

        const y = d3.scaleBand()
            .domain(nutrients.map(d => d.name))
            .range([0, innerH])
            .padding(0.25);

        const color = d3.scaleOrdinal<string>()
            .domain(nutrients.map(d => d.name))
            .range(["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00"]);

        g.selectAll("rect")
            .data(nutrients)
            .enter()
            .append("rect")
            .attr("x", 0)
            .attr("y", d => y(d.name)!)
            .attr("width", d => x(d.value))
            .attr("height", y.bandwidth())
            .attr("fill", d => color(d.name))
            .attr("opacity", 0.9);

        g.selectAll("text.label")
            .data(nutrients)
            .enter()
            .append("text")
            .attr("class", "label")
            .attr("x", -8)
            .attr("y", d => (y(d.name)! + y.bandwidth() / 2))
            .attr("text-anchor", "end")
            .attr("dominant-baseline", "middle")
            .style("font-size", "11px")
            .text(d => d.name);

        g.selectAll("text.value")
            .data(nutrients)
            .enter()
            .append("text")
            .attr("class", "value")
            .attr("x", d => x(d.value) + 6)
            .attr("y", d => (y(d.name)! + y.bandwidth() / 2))
            .attr("dominant-baseline", "middle")
            .style("font-size", "11px")
            .text(d => `${d.value.toFixed(1)}${d.unit}`);

    }, [data]);



    return <svg ref={svgRef} width={300} height={260}/>;
}
