import React from "react";
import ScrollySupermarket from "./ScrollySupermarket";
import RadarComparison from "../components/RadarComparison";

function App() {
  return (
    <div className="bg-[#fcfcfc] text-gray-800 font-serif leading-relaxed antialiased">
      {/* --- HERO SECTION --- */}
      <section
        className="relative z-10 w-full h-screen flex flex-col justify-center py-20
                          bg-white/40 backdrop-blur-md border-b border-white/20 backdrop-filter"
      >
        <div className="max-w-2xl mx-auto px-6">
          <h1 className="font-sans text-6xl font-extrabold tracking-tight mb-6 text-gray-900 drop-shadow-sm">
            The Hidden Shape of Food
          </h1>
          <p className="text-xl text-gray-900 mb-6 leading-8 font-medium">
            We walk the aisles every week, trusting the labels on the front of
            the box. But what if we could see the mathematical reality of what
            we eat?
          </p>
          <p className="text-xl text-gray-900 leading-8 font-medium">
            Using machine learning to analyze over 30,000 products, we mapped
            the hidden connections between ingredients, processing, and health.
          </p>
        </div>
      </section>

      {/* --- THE SCROLLY EXPERIENCE --- */}
      {/* Contains Supermarket -> Frosted Text -> Linked Dashboard */}
      <div className="relative">
        <ScrollySupermarket />
        <RadarComparison />
      </div>

      {/* --- FOOTER --- */}
      <footer className="w-full bg-white py-12 text-center border-t border-gray-100 text-sm font-sans z-10 relative">
        <p className="opacity-60">Data source: OpenFoodFacts.</p>
      </footer>
    </div>
  );
}

export default App;
