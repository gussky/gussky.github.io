import type { Product } from "./types";
import { getNutriScoreColor } from "./utils";
import { FadeInSection } from "./FadeInSection";

interface Stage2Props {
  product1: Product | null;
  product2: Product | null;
}

export default function Stage2Reveal({ product1, product2 }: Stage2Props) {
  return (
    <div className="stage-container stage-2">
      <FadeInSection delay="0.2s">
        <div
          className="visual-comparison-row"
          style={{ alignItems: "stretch" }}
        >
          <div className="reveal-circle-container">
            <div
              className="reveal-circle"
              style={{
                backgroundColor: getNutriScoreColor(product1!.nutriscore),
              }}
            >
              {product1!.nutriscore}
            </div>
            <div
              style={{
                fontWeight: 700,
                color: "#8884d8",
                maxWidth: "180px",
                textAlign: "center",
              }}
            >
              {product1!.name}
            </div>
          </div>

          <div className="vs-divider">VS</div>

          <div className="reveal-circle-container">
            <div
              className="reveal-circle"
              style={{
                backgroundColor: getNutriScoreColor(product2!.nutriscore),
              }}
            >
              {product2!.nutriscore}
            </div>
            <div
              style={{
                fontWeight: 700,
                color: "#82ca9d",
                maxWidth: "180px",
                textAlign: "center",
              }}
            >
              {product2!.name}
            </div>
          </div>
        </div>
      </FadeInSection>

      <div className="reveal-text">
        <FadeInSection delay="0.4s">
          <p className="story-paragraph">
            Everything looks identical on paper. They share the exact same
            nutritional nutriscore ingredients.
          </p>
        </FadeInSection>
        <FadeInSection delay="0.5s">
          <p className="story-paragraph">
            Yet, one is celebrated with a{" "}
            <span className="font-bold" style={{ color: "#eab308" }}>
              C
            </span>{" "}
            while the other is marked with a{" "}
            <span className="font-bold" style={{ color: "#ef4444" }}>
              E
            </span>
            . It's a massive discrepancy that defies simple arithmetic.
          </p>
        </FadeInSection>
        <FadeInSection delay="0.6s">
          <p className="story-paragraph font-bold">
            Something hidden is tipping the scales. Scroll down to uncover the
            missing variables.
          </p>
        </FadeInSection>
      </div>
    </div>
  );
}
