import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import ProductSelector from "./ProductSelector";
import type { Product } from "./types";
import { getNutriScoreColor } from "./utils";
// import { useVisibilityObserver } from "./useVisibilityObserver";
import { FadeInSection } from "./FadeInSection";

interface Stage3Props {
  products: Product[];
  selection1: Product;
  selection2: Product;
  setSelection1: (p: Product) => void;
  setSelection2: (p: Product) => void;
  chartData: any[];
}

export default function Stage3Interactive({
  products,
  selection1,
  selection2,
  setSelection1,
  setSelection2,
  chartData,
}: Stage3Props) {
  // const [ref, isVisible] = useVisibilityObserver<HTMLDivElement>();

  return (
    <div className="stage-container stage-3">
      {/* LEFT COLUMN: Narrative & Inputs */}
      <FadeInSection
        className="split-layout-left"
        style={{ justifyContent: "center" }}
        threshold={0.2}
      >
        <h2
          className="title-main"
          style={{ textAlign: "left", marginBottom: "1rem" }}
        >
          The Full Picture
        </h2>

        <div
          style={{
            padding: "1.5rem",
            backgroundColor: "#fff",
            borderRadius: "16px",
            border: "1px solid #f3f4f6",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
            marginBottom: "2rem",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: "#111827",
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "1.2rem",
            }}
          >
            Look Beyond the Grade
          </h3>
          <p
            className="text-dark"
            style={{ lineHeight: 1.7, fontSize: "0.95rem", color: "#4b5563" }}
          >
            The Nutri-Score algorithm is complex. It rewards fiber, proteins,
            fruits, vegetables and nuts, but heavily penalizes energy density,
            sugars, saturated fats, and sodium.
          </p>
          <p
            className="text-dark"
            style={{
              lineHeight: 1.7,
              fontSize: "0.95rem",
              color: "#4b5563",
              marginTop: "1rem",
            }}
          >
            Sometimes, two products can have identical "negative" factors but
            differ wildly because one contains just enough "positive" nutrients
            to boost its score.
          </p>
          <p
            className="text-dark"
            style={{
              lineHeight: 1.7,
              fontSize: "0.95rem",
              color: "#4b5563",
              marginTop: "1rem",
            }}
          >
            For example, a slight increase in fruit content can push a product
            from a 'E' to a 'C', masking high sugar levels. A product might be
            penalized heavily for just crossing a fat threshold, despite having
            good protein content.
          </p>
          <p
            className="text-dark"
            style={{
              lineHeight: 1.7,
              fontSize: "0.95rem",
              color: "#4b5563",
              marginTop: "1rem",
            }}
          >
            It is important to follow your own dietary needs. You might benefit
            from a product, which the nutriscore system would not recommend.
          </p>
        </div>

        <p
          style={{
            fontSize: "1.1rem",
            lineHeight: "1.6",
            color: "#1f2937",
            fontWeight: 500,
            marginBottom: "2rem",
          }}
        >
          Use this graph to compare the nutritional profile of two products.
          Don't let the Nutri-Score blind you. Investigate the variables
          yourself.
        </p>
      </FadeInSection>

      {/* RIGHT COLUMN: Graph & Controls */}
      <FadeInSection className="split-layout-right" threshold={0.2}>
        {/* Interactive Controls */}
        <div className="controls-row">
          <ProductSelector
            label="Product 1"
            color="#8884d8"
            allProducts={products}
            selection={selection1}
            setSelection={setSelection1}
            getNutriScoreColor={getNutriScoreColor}
            isRevealed={true}
          />
          <div className="vs-divider">VS</div>
          <ProductSelector
            label="Product 2"
            color="#82ca9d"
            allProducts={products}
            selection={selection2}
            setSelection={setSelection2}
            getNutriScoreColor={getNutriScoreColor}
            isRevealed={true}
          />
        </div>

        {/* Merged Chart */}
        <div className="chart-container-large">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
              <PolarGrid />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "#666", fontSize: 12 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={false}
                axisLine={false}
              />
              <Radar
                name={selection1.name}
                dataKey="val1Normalized"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.4}
              />
              <Radar
                name={selection2.name}
                dataKey="val2Normalized"
                stroke="#82ca9d"
                fill="#82ca9d"
                fillOpacity={0.4}
              />
              <Legend />
              <Tooltip
                wrapperStyle={{ zIndex: 1000 }}
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                }}
                formatter={(_: any, name: any, props: any) => {
                  if (!props || !props.payload) return [];
                  const dataKey = props.dataKey;
                  const realKey =
                    dataKey === "val1Normalized" ? "val1Real" : "val2Real";
                  const realValue = props.payload[realKey];
                  return [
                    `${Number(realValue).toFixed(2)}`,
                    `${name} (per 100g)`,
                  ];
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </FadeInSection>
    </div>
  );
}
