import {
  BarChart,
  Bar,
  LabelList,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import type { Product } from "./types";
import { FEATURES } from "./constants";
import { FadeInSection } from "./FadeInSection";

interface Stage1Props {
  product1: Product | null;
  product2: Product | null;
  chartData: any[]; // Or define a specific shape for chart data
}

export default function Stage1Butterfly({
  product1,
  product2,
  chartData,
}: Stage1Props) {
  return (
    <div className="stage-container stage-1">
      <FadeInSection>
        <h2 className="title-main">Twins?</h2>
        <h1 className="subtitle">
          Look closely at these two products. Identical energy, sugar, salt, and
          protein values per 100g. Logic suggests they should have the same
          Nutri-Score, right?
        </h1>
      </FadeInSection>

      {/* Visual Names */}
      <FadeInSection delay="0.2s">
        <div className="visual-comparison-row">
          <div
            className="name-box"
            style={{
              border: "2px solid #8884d8",
              color: "#8884d8",
            }}
          >
            {product1?.name}
          </div>
          <div className="vs-divider">VS</div>
          <div
            className="name-box"
            style={{
              border: "2px solid #82ca9d",
              color: "#82ca9d",
            }}
          >
            {product2?.name}
          </div>
        </div>
      </FadeInSection>

      {/* Butterfly (Mirror) Chart */}
      <FadeInSection delay="0.4s">
        <div className="charts-row">
          {/* LEFT: Product 1 (Reversed) */}
          <div style={{ width: "100%", height: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, bottom: 5, left: 10, right: 10 }}
                barCategoryGap={15}
              >
                <XAxis type="number" hide reversed={true} domain={[0, 100]} />
                <YAxis type="category" dataKey="subject" hide />
                <Bar
                  dataKey="val1Normalized"
                  fill="#8884d8"
                  radius={[4, 0, 0, 4]} // Round outer edges (left side)
                  barSize={24}
                >
                  <LabelList
                    dataKey="val1Real"
                    position="insideRight"
                    fill="#fff"
                    fontSize={10}
                    formatter={(val: any) => Number(val).toFixed(1)}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* CENTER: Axis Labels */}
          <div className="butterfly-axis">
            {FEATURES.map((f) => (
              <div key={f.key} className="axis-label-item">
                {f.label}
              </div>
            ))}
          </div>

          {/* RIGHT: Product 2 (Normal) */}
          <div style={{ width: "100%", height: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, bottom: 5, left: 10, right: 10 }}
                barCategoryGap={15}
              >
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis type="category" dataKey="subject" hide />
                <Bar
                  dataKey="val2Normalized"
                  fill="#82ca9d"
                  radius={[0, 4, 4, 0]} // Round outer edges (right side)
                  barSize={24}
                >
                  <LabelList
                    dataKey="val2Real"
                    position="insideLeft"
                    fill="#fff"
                    fontSize={10}
                    formatter={(val: any) => Number(val).toFixed(1)}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </FadeInSection>

      <FadeInSection delay="0.6s">
        <div
          className="text-center text-subtle"
          style={{ marginTop: "2rem", opacity: 0.8 }}
        >
          But wait...
        </div>
      </FadeInSection>
    </div>
  );
}
