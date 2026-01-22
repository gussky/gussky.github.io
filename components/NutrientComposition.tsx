// NutrientComposition.tsx
import React, {useEffect, useRef} from "react";
import * as d3 from "d3";

type Grade = "A" | "B" | "C" | "D" | "E";

type NutrientKey =
    | "Energy"
    | "Sugars"
    | "SatFat"
    | "Sodium"
    | "Protein"
    | "Fiber"
    | "FruitVeg";

type RowAgg = {
    grade: Grade;
    netScore: number;
} & Record<NutrientKey, number>;

type CsvRow = {
    product_name?: string;
    nutriscore_grade?: string;
    nutriscore_score?: string | number;
    nova_group?: string | number;
    "energy-kcal_100g"?: string | number;
    "saturated-fat_100g"?: string | number;
    sugars_100g?: string | number;
    sodium_100g?: string | number;
    "fruits-vegetables-nuts_100g"?: string | number;
    fiber_100g?: string | number;
    proteins_100g?: string | number;
};

function toNum(v: unknown): number {
    const n = typeof v === "number" ? v : v == null ? NaN : Number(String(v).trim());
    return Number.isFinite(n) ? n : NaN;
}

function pointsFromThresholds(x: number, thresholds: number[]): number {
    if (!Number.isFinite(x)) return NaN;
    let p = 0;
    for (let i = 0; i < thresholds.length; i++) {
        if (x > thresholds[i]) p = i + 1;
        else break;
    }
    return p;
}

function computeNutriScoreComponentsSolid(d: {
    energyKcal100g: number;
    sugars100g: number;
    satFat100g: number;
    sodium100g: number; // g/100g
    fiber100g: number;
    protein100g: number;
    fruitVegNuts100g: number; // 0..100 (%)
}): {
    Energy: number;
    Sugars: number;
    SatFat: number;
    Sodium: number;
    Fiber: number;
    Protein: number;
    FruitVeg: number;
    computedNetScore: number;
} {
    const energyKJ = d.energyKcal100g * 4.184;
    const sodiumMg = d.sodium100g * 1000;

    const Energy = pointsFromThresholds(energyKJ, [
        335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350,
    ]);
    const Sugars = pointsFromThresholds(d.sugars100g, [
        4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45,
    ]);
    const SatFat = pointsFromThresholds(d.satFat100g, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const Sodium = pointsFromThresholds(sodiumMg, [90, 180, 270, 360, 450, 540, 630, 720, 810, 900]);

    const N = Energy + Sugars + SatFat + Sodium;

    let FruitVeg = 0;
    if (Number.isFinite(d.fruitVegNuts100g)) {
        if (d.fruitVegNuts100g >= 80) FruitVeg = 5;
        else if (d.fruitVegNuts100g >= 60) FruitVeg = 2;
        else if (d.fruitVegNuts100g >= 40) FruitVeg = 1;
    }

    const Fiber = pointsFromThresholds(d.fiber100g, [0.9, 1.9, 2.8, 3.7, 4.7]);

    let Protein = pointsFromThresholds(d.protein100g, [1.6, 3.2, 4.8, 6.4, 8.0]);

    // classic rule: if N >= 11 and FruitVeg < 5, protein points not counted
    if (N >= 11 && FruitVeg < 5) Protein = 0;

    const P = FruitVeg + Fiber + Protein;

    return {Energy, Sugars, SatFat, Sodium, Fiber, Protein, FruitVeg, computedNetScore: N - P};
}

const DEFAULT_CSV_URL = "/all_products_cleaned.csv";

const NutrientComposition: React.FC<{ csvUrl?: string }> = ({csvUrl = DEFAULT_CSV_URL}) => {
    const chartRef = useRef<HTMLDivElement | null>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!chartRef.current || !tooltipRef.current) return;

        // Clear previous renders
        d3.select(chartRef.current).selectAll("*").remove();

        const tooltip = d3.select(tooltipRef.current);
        let cancelled = false;

        (async () => {
            const raw = (await d3.csv(csvUrl)) as unknown as CsvRow[];
            if (cancelled) return;

            const grades: Grade[] = ["A", "B", "C", "D", "E"];

            const clean = raw
                .map((r) => {
                    const gradeRaw = (r.nutriscore_grade ?? "").toString().trim().toUpperCase();
                    const grade = grades.includes(gradeRaw as Grade) ? (gradeRaw as Grade) : null;
                    if (!grade) return null;

                    const energyKcal100g = toNum(r["energy-kcal_100g"]);
                    const sugars100g = toNum(r.sugars_100g);
                    const satFat100g = toNum(r["saturated-fat_100g"]);
                    const sodium100g = toNum(r.sodium_100g);
                    const fiber100g = toNum(r.fiber_100g);
                    const protein100g = toNum(r.proteins_100g);
                    const fruitVegNuts100g = toNum(r["fruits-vegetables-nuts_100g"]);

                    const essentials = [
                        energyKcal100g,
                        sugars100g,
                        satFat100g,
                        sodium100g,
                        fiber100g,
                        protein100g,
                        fruitVegNuts100g,
                    ];
                    if (essentials.some((v) => !Number.isFinite(v))) return null;

                    const comp = computeNutriScoreComponentsSolid({
                        energyKcal100g,
                        sugars100g,
                        satFat100g,
                        sodium100g,
                        fiber100g,
                        protein100g,
                        fruitVegNuts100g,
                    });

                    const nsFromFile = toNum(r.nutriscore_score);
                    const netScore = Number.isFinite(nsFromFile) ? nsFromFile : comp.computedNetScore;

                    return {
                        grade,
                        netScore,
                        Energy: comp.Energy,
                        Sugars: comp.Sugars,
                        SatFat: comp.SatFat,
                        Sodium: comp.Sodium,
                        Protein: comp.Protein,
                        Fiber: comp.Fiber,
                        FruitVeg: comp.FruitVeg,
                    } as RowAgg;
                })
                .filter((x): x is RowAgg => x !== null);

            const byGrade = d3.group(clean, (d) => d.grade);

            const data: RowAgg[] = grades.map((g) => {
                const arr = byGrade.get(g) ?? [];
                const mean = (k: keyof RowAgg) => d3.mean(arr, (d) => d[k] as unknown as number) ?? 0;

                return {
                    grade: g,
                    Energy: mean("Energy"),
                    Sugars: mean("Sugars"),
                    SatFat: mean("SatFat"),
                    Sodium: mean("Sodium"),
                    Protein: mean("Protein"),
                    Fiber: mean("Fiber"),
                    FruitVeg: mean("FruitVeg"),
                    netScore: mean("netScore"),
                };
            });

            const negatives = [
                {key: "Energy" as const, label: "Energy"},
                {key: "Sugars" as const, label: "Sugars"},
                {key: "SatFat" as const, label: "Saturated Fats"},
                {key: "Sodium" as const, label: "Sodium"},
            ];

            const positives = [
                {key: "Protein" as const, label: "Protein"},
                {key: "Fiber" as const, label: "Fiber"},
                {key: "FruitVeg" as const, label: "Fruit/Veg/Nuts"},
            ];

            // Reserve right side inside SVG for legend
            const legendPanelWidth = 220;

            const margin = {top: 50, right: 30, bottom: 40, left: 50};
            const width = 750 - margin.left - margin.right;
            const height = 450 - margin.top - margin.bottom;

            const plotWidth = width - legendPanelWidth;
            
            const svgRoot = d3
                .select(chartRef.current)
                .append("svg")
                .attr(
                    "viewBox",
                    `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`
                )
                .attr("style", "max-width: 100%; height: auto;");

            const svg = svgRoot
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            // Background panel for legend (inside plot window)
            svg
                .append("rect")
                .attr("x", plotWidth + 12)
                .attr("y", -10)
                .attr("width", legendPanelWidth - 24)
                .attr("height", height + 20)
                .attr("fill", "white")
                .attr("rx", 10)
                .attr("ry", 10)
                .attr("opacity", 1);

            const y = d3
                .scaleBand<Grade>()
                .domain(["A", "B", "C", "D", "E"])
                .range([0, height])
                .padding(0.4);

            const x = d3.scaleLinear().domain([-15, 30]).range([0, plotWidth]);

            const color = d3
                .scaleOrdinal<string, string>()
                .domain([...positives.map((d) => d.key), ...negatives.map((d) => d.key)])
                .range([
                    "#2E7D32",
                    "#43A047",
                    "#66BB6A",
                    "#D32F2F",
                    "#F44336",
                    "#FF9800",
                    "#795548",
                ]);

            const zones = [
                {id: "A", min: -15, max: -0.5, color: "#008a4f", opacity: 0.1, label: "< -1"},
                {id: "B", min: -0.5, max: 2.5, color: "#85bb2f", opacity: 0.1, label: "0 - 2"},
                {id: "C", min: 2.5, max: 10.5, color: "#fecb02", opacity: 0.1, label: "3 - 10"},
                {id: "D", min: 10.5, max: 18.5, color: "#ee8100", opacity: 0.1, label: "11 - 18"},
                {id: "E", min: 18.5, max: 30, color: "#e63e11", opacity: 0.1, label: "> 19"},
            ];

            svg
                .append("g")
                .selectAll("rect.zone")
                .data(zones)
                .join("rect")
                .attr("class", "zone")
                .attr("x", (d) => x(d.min))
                .attr("y", -20)
                .attr("width", (d) => x(d.max) - x(d.min))
                .attr("height", height + 20)
                .attr("fill", (d) => d.color)
                .attr("opacity", (d) => d.opacity);

            svg
                .append("g")
                .selectAll("text.zoneLabel")
                .data(zones)
                .join("text")
                .attr("class", "zoneLabel")
                .attr("x", (d) => x((d.min + d.max) / 2))
                .attr("y", -5)
                .attr("text-anchor", "middle")
                .attr("font-size", "8px")
                .attr("opacity", "70%")
                .attr("fill", (d) => d.color.replace("0.1", "1"))
                .text((d) => `Grade ${d.id}`);

            const stackNeg = d3.stack<RowAgg>().keys(negatives.map((d) => d.key))(data);
            const stackPos = d3.stack<RowAgg>().keys(positives.map((d) => d.key))(data);

            function showTooltip(evt: MouseEvent, d: any, type: string) {
                const nutrientKey = (d3.select((evt.target as any).parentNode).datum() as any).key;
                const value = (d[1] - d[0]).toFixed(1);

                tooltip
                    .style("opacity", 1)
                    .html(`<strong>${nutrientKey}</strong><br/>
                       Avg Contribution: ${value} pts<br/>
                       <small>${type}</small>`);

                d3.select(evt.target as any).attr("opacity", 0.8);
            }

            function moveTooltip(evt: MouseEvent) {
                tooltip.style("left", evt.clientX + 10 + "px").style("top", evt.clientY - 10 + "px");
            }

            function hideTooltip(evt: MouseEvent) {
                tooltip.style("opacity", 0);
                d3.select(evt.target as any).attr("opacity", 1);
            }

            // Negatives
            svg
                .append("g")
                .selectAll("g")
                .data(stackNeg)
                .join("g")
                .attr("fill", (d: any) => color(d.key))
                .selectAll("rect")
                .data((d: any) => d)
                .join("rect")
                .attr("y", (d: any) => y(d.data.grade)!)
                .attr("x", (d: any) => x(0) + (x(d[0]) - x(0)))
                .attr("width", (d: any) => x(d[1]) - x(d[0]))
                .attr("height", y.bandwidth())
                .on("mouseover", (evt: MouseEvent, d: any) => showTooltip(evt, d, "Bad Points (Adds to Score)"))
                .on("mousemove", (evt: MouseEvent) => moveTooltip(evt))
                .on("mouseleave", (evt: MouseEvent) => hideTooltip(evt));

            // Positives
            svg
                .append("g")
                .selectAll("g")
                .data(stackPos)
                .join("g")
                .attr("fill", (d: any) => color(d.key))
                .selectAll("rect")
                .data((d: any) => d)
                .join("rect")
                .attr("y", (d: any) => y(d.data.grade)!)
                .attr("x", (d: any) => x(-d[1]))
                .attr("width", (d: any) => x(-d[0]) - x(-d[1]))
                .attr("height", y.bandwidth())
                .on("mouseover", (evt: MouseEvent, d: any) =>
                    showTooltip(evt, d, "Good Points (Subtracts from Score)")
                )
                .on("mousemove", (evt: MouseEvent) => moveTooltip(evt))
                .on("mouseleave", (evt: MouseEvent) => hideTooltip(evt));

            // Net score markers
            svg
                .append("g")
                .selectAll("path")
                .data(data)
                .join("path")
                .attr(
                    "transform",
                    (d) => `translate(${x(d.netScore)}, ${y(d.grade)! + y.bandwidth() / 2}) rotate(45)`
                )
                .attr("d", d3.symbol().type(d3.symbolSquare).size(100))
                .attr("fill", "black")
                .attr("stroke", "white")
                .attr("stroke-width", 2)
                .style("cursor", "pointer")
                .on("mouseover", function (_evt: MouseEvent, d: RowAgg) {
                    tooltip
                        .style("opacity", 1)
                        .html(`<strong>Grade ${d.grade} Net Score</strong><br/>
                           Score: ${d.netScore.toFixed(1)}<br/>
                           (Bad Pts - Good Pts)`);
                    d3.select(this as any).attr(
                        "transform",
                        `translate(${x(d.netScore)}, ${y(d.grade)! + y.bandwidth() / 2}) rotate(45) scale(1.5)`
                    );
                })
                .on("mousemove", (evt: MouseEvent) => moveTooltip(evt))
                .on("mouseleave", function (_evt: MouseEvent, d: RowAgg) {
                    tooltip.style("opacity", 0);
                    d3.select(this as any).attr(
                        "transform",
                        `translate(${x(d.netScore)}, ${y(d.grade)! + y.bandwidth() / 2}) rotate(45) scale(1)`
                    );
                });

            // X axis
            svg
                .append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x).ticks(10) as any)
                .call((g) => (g as any).select(".domain").remove());

            // Zero line
            svg
                .append("line")
                .attr("x1", x(0))
                .attr("x2", x(0))
                .attr("y1", -20)
                .attr("y2", height)
                .attr("stroke", "#333")
                .attr("stroke-width", 2);

            // Axis titles (UNCHANGED)
            svg
                .append("text")
                .attr("x", x(8))
                .attr("y", height + 35)
                .attr("text-anchor", "middle")
                .attr("fill", "#D32F2F")
                .attr("font-size", "12px")
                .text("Undesirable →");

            svg
                .append("text")
                .attr("x", x(-8))
                .attr("y", height + 35)
                .attr("text-anchor", "middle")
                .attr("fill", "#2E7D32")
                .attr("font-size", "12px")
                .text("← Desirable");

            // Y grade labels
            const yAxisGroup = svg.append("g");
            yAxisGroup
                .selectAll("text")
                .data(["A", "B", "C", "D", "E"] as Grade[])
                .join("text")
                .attr("x", -10)
                .attr("y", (d) => y(d)! + y.bandwidth() / 2)
                .attr("dy", "0.35em")
                .attr("text-anchor", "end")
                .attr("font-weight", "bold")
                .attr("font-size", "20px")
                .attr("fill", "#333")
                .text((d) => d);

            // --- LEGEND INSIDE SVG (right side panel), same content as before ---
            const legendG = svg.append("g").attr("transform", `translate(${plotWidth + 22}, 10)`);

            // helper to draw legend rows
            const rowH = 18;
            let yCursor = 0;

            function legendTitle(text: string, colorText: string) {
                legendG
                    .append("text")
                    .attr("x", 0)
                    .attr("y", yCursor)
                    .attr("font-size", "11px")
                    .attr("font-weight", "bold")
                    .attr("fill", colorText)
                    .text(text);
                yCursor += 18;
            }

            function legendItem(label: string, fill: string) {
                legendG
                    .append("rect")
                    .attr("x", 0)
                    .attr("y", yCursor - 10)
                    .attr("width", 14)
                    .attr("height", 14)
                    .attr("rx", 3)
                    .attr("ry", 3)
                    .attr("fill", fill);

                legendG
                    .append("text")
                    .attr("x", 20)
                    .attr("y", yCursor + 1)
                    .attr("font-size", "13px")
                    .attr("fill", "#333")
                    .text(label);

                yCursor += rowH;
            }

            // Result section (diamond marker)
            legendTitle("Result", "black");
            // diamond marker
            legendG
                .append("rect")
                .attr("x", 1)
                .attr("y", yCursor - 11)
                .attr("width", 12)
                .attr("height", 12)
                .attr("fill", "#000")
                .attr("transform", `translate(0,0) rotate(45, 7, ${yCursor - 5})`);
            legendG
                .append("text")
                .attr("x", 20)
                .attr("y", yCursor + 1)
                .attr("font-size", "13px")
                .attr("fill", "#333")
                .text("Net Score (N - P)");
            yCursor += rowH + 10;

            // Good Attributes
            legendTitle("Good Attributes", "#2E7D32");
            positives.forEach((p) => legendItem(p.label, color(p.key)));

            yCursor += 10;

            // Bad Attributes
            legendTitle("Bad Attributes", "#D32F2F");
            negatives.forEach((n) => legendItem(n.label, color(n.key)));
        })();

        return () => {
            cancelled = true;
            d3.select(chartRef.current).selectAll("*").remove();
            d3.select(tooltipRef.current).style("opacity", 0);
        };
    }, [csvUrl]);

    return (
        <div className="font-sans p-4">
            <div ref={chartRef} className="scale-50"/>
            <div ref={tooltipRef}
                 className="fixed bg-white shadow-lg rounded-lg p-4 opacity-0 transition-opacity max-w-[250px] z-50 font-size-sm"/>
        </div>
    );
};

export default NutrientComposition;
