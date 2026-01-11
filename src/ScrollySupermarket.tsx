import { useEffect, useRef, useState } from "react";
import LinkedD3Dashboard from "./D3LinkedDashboard.tsx";

// --- CONFIGURATION ---
const MAP_SCALE = 0.85;

// We stick to the 5-segment structure but swap the content of the last two
const SEGMENT_CONFIG = [
  { id: "start_to_produce", start: 0.0, end: 0.15 },
  { id: "produce_to_meat", start: 0.15, end: 0.35 },
  { id: "meat_to_dairy", start: 0.35, end: 0.55 },
  { id: "dairy_to_map", start: 0.55, end: 0.75 }, // Previously Bakery
  { id: "map_to_dash", start: 0.75, end: 1.0 }, // Previously Checkout
];

// Helper Components
const MapShelf = ({ className, label, ...props }: any) => (
  <div
    className={`absolute rounded flex items-center justify-center text-white font-bold font-sans text-sm z-10 shadow-sm ${className}`}
    {...props}
  >
    {label}
  </div>
);

const AisleV = ({ label, className, ...props }: any) => (
  <div
    className={`rounded absolute w-[40px] h-[140px] bg-amber-400 top-[130px] font-sans flex items-center justify-center text-[10px] tracking-widest font-bold text-black/40 shadow-sm [writing-mode:vertical-rl] rotate-180 ${className}`}
    {...props}
  >
    {label}
  </div>
);

const AisleH = ({ label, className, ...props }: any) => (
  <div
    className={`rounded absolute h-[40px] w-[140px] bg-amber-400 font-sans flex items-center justify-center text-[10px] tracking-widest font-bold text-black/40 shadow-sm ${className}`}
    {...props}
  >
    {label}
  </div>
);

export default function ScrollySupermarket() {
  const [pathProgress, setPathProgress] = useState(0);
  const gapRefs = useRef<Array<HTMLDivElement | null>>([]);
  const cartRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  // --- SCROLL ENGINE ---
  useEffect(() => {
    const handleScroll = () => {
      const winHeight = window.innerHeight;
      let calculatedP = 0;

      for (let i = 0; i < SEGMENT_CONFIG.length; i++) {
        const segment = SEGMENT_CONFIG[i];
        const ref = gapRefs.current[i];
        if (!ref) continue;

        const rect = ref.getBoundingClientRect();
        const startPixel = winHeight;
        const endPixel = -rect.height;
        const currentPixel = rect.top;
        const rawProgress =
          (startPixel - currentPixel) / (startPixel - endPixel);

        if (rawProgress < 0) {
          break;
        } else if (rawProgress >= 0 && rawProgress <= 1) {
          const range = segment.end - segment.start;
          calculatedP = segment.start + rawProgress * range;
          break;
        } else {
          calculatedP = segment.end;
        }
      }
      setPathProgress(calculatedP);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // --- MAP RENDERER ---
  useEffect(() => {
    if (!cartRef.current || !pathRef.current) return;
    const path = pathRef.current;
    const len = path.getTotalLength();
    const safeP = Math.max(0, Math.min(1, pathProgress));
    const dist = safeP * len;

    const pt = path.getPointAtLength(dist);
    const lookAhead = Math.min(dist + 5, len);
    const nextPt = path.getPointAtLength(lookAhead);
    const angle =
      Math.atan2(nextPt.y - pt.y, nextPt.x - pt.x) * (180 / Math.PI) + 90;

    cartRef.current.style.left = `${pt.x - 15}px`;
    cartRef.current.style.top = `${pt.y - 18}px`;
    cartRef.current.style.transform = `rotate(${angle}deg)`;
  }, [pathProgress]);

  return (
    <div className="relative w-full">
      {/* --- FIXED MAP BACKGROUND --- */}
      <div className="fixed inset-0 z-0 bg-[#fdfbf7] flex items-center justify-center">
        <div
          className="relative w-[800px] h-[600px] origin-center transition-transform duration-75"
          style={{ transform: `scale(${MAP_SCALE})` }}
        >
          <MapShelf
            label="DAIRY"
            className="bg-green-500 top-[105px] left-[20px] w-[80px] h-[250px]"
          />
          <MapShelf
            label="MEAT & FISH"
            className="bg-red-500 top-[20px] left-[20px] w-[760px] h-[60px]"
          />
          <MapShelf
            label="BEVERAGES"
            className="bg-blue-400 top-[105px] right-[20px] w-[100px] h-[300px]"
          />

          <AisleV label="READY TO EAT" className="left-[180px]" />
          <AisleV label="CANS" className="left-[280px]" />
          <AisleV label="SAUCES" className="left-[450px]" />
          <AisleV label="OIL/BUTTER" className="left-[550px]" />

          <AisleH label="SNACKS" className="top-[330px] left-[215px]" />
          <AisleH label="SNACKS" className="top-[330px] left-[415px]" />
          <AisleH label="SNACKS" className="top-[410px] left-[215px]" />
          <AisleH label="SNACKS" className="top-[410px] left-[415px]" />

          <MapShelf
            label="CHECKOUT"
            className="bg-purple-500 top-auto bottom-[20px] left-[250px] w-[300px] h-[50px]"
          />

          <div className="absolute bottom-[20px] left-[20px] font-bold font-sans text-gray-500 text-sm">
            ENTRANCE
          </div>
          <div className="absolute bottom-[20px] right-[20px] font-bold font-sans text-gray-500 text-sm">
            EXIT
          </div>

          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <path
              ref={pathRef}
              d="M 60 600 L 60 400 L 130 400 L 130 100 L 250 100 L 250 300 L 350 300 L 350 100 L 420 100 L 420 300 L 520 300 L 520 100 L 650 100 L 650 390 L 180 390 L 180 510 L 765 510 L 765 575"
              fill="none"
              stroke="none"
            />
          </svg>

          <div
            ref={cartRef}
            className="absolute w-[30px] h-[36px] z-20 origin-center transition-transform duration-100 ease-linear"
          >
            <svg
              viewBox="0 0 50 60"
              className="w-full h-full drop-shadow-md text-red-600 fill-current"
            >
              <rect x="10" y="10" width="30" height="40" rx="3" />
              <line
                x1="10"
                y1="45"
                x2="40"
                y2="45"
                stroke="white"
                strokeWidth="2"
              />
              <rect
                x="5"
                y="50"
                width="40"
                height="5"
                className="fill-gray-800"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* --- SCROLLING CONTENT --- */}
      <div className="relative z-10 w-full">
        {/* 1. INTRO */}
        <Section title="The Food Journey" subtitle="Scroll down to shop." />

        <div
          ref={(el) => {
            gapRefs.current[0] = el;
          }}
          className="w-full h-[75vh] pointer-events-none"
        />

        {/* 2. PRODUCE */}
        <Section
          title="1. Produce Section"
          subtitle="Fresh fruits and vegetables."
        >
          <PlaceholderChart label="Produce Analysis" />
        </Section>

        <div
          ref={(el) => {
            gapRefs.current[1] = el;
          }}
          className="w-full h-[75vh] pointer-events-none"
        />

        {/* 3. MEAT */}
        <Section title="2. Meat & Fish" subtitle="Proteins and seafood.">
          <PlaceholderChart label="Meat Analysis" />
        </Section>

        <div
          ref={(el) => {
            gapRefs.current[2] = el;
          }}
          className="w-full h-[75vh] pointer-events-none"
        />

        {/* 4. DAIRY */}
        <Section title="3. Dairy Aisle" subtitle="Milk, cheese, and yogurt.">
          <PlaceholderChart label="Dairy Analysis" />
        </Section>

        <div
          ref={(el) => {
            gapRefs.current[3] = el;
          }}
          className="w-full h-[75vh] pointer-events-none"
        />

        {/* --- 5. FROSTED GLASS / MAPPING THE LANDSCAPE --- */}
        <section
          className="min-h-screen flex flex-col justify-center w-full py-24
                                    bg-white/80 backdrop-blur-md border-y border-white/40 backdrop-filter
                                    shadow-lg z-20"
        >
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="font-sans text-4xl font-bold mb-6 text-gray-900">
              4. Mapping the Landscape
            </h2>
            <p className="text-lg text-gray-900 mb-6 font-medium">
              As we leave the physical aisles, a new map emerges. By analyzing
              ingredients mathematically, we can group food by nutritional
              similarity rather than store category.
            </p>
            <p className="text-lg text-gray-900 font-medium">
              Below, explore two views:{" "}
              <strong className="bg-white/50 px-1 rounded">Nutri-Score</strong>{" "}
              vs <strong className="bg-white/50 px-1 rounded">NOVA</strong>{" "}
              (Processing). Notice how products clump together based on their
              hidden "Nutritional DNA."
            </p>
          </div>
        </section>

        <div
          ref={(el) => {
            gapRefs.current[4] = el;
          }}
          className="w-full h-[75vh] pointer-events-none"
        />

        {/* --- 6. LINKED DASHBOARD --- */}
        {/* Replaces Checkout Section */}
        <Section
          title="Mapping the Landscape"
          subtitle="Explore the data below."
        >
          <LinkedD3Dashboard />
        </Section>

        {/*<div className="h-[50vh] bg-white" />*/}
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---
const Section = ({ title, subtitle, children }: any) => (
  // Standard opaque sections for aisles
  <section className="min-h-screen bg-white border-y border-gray-100 flex flex-col items-center justify-center py-20 px-5 shadow-[0_0_40px_rgba(0,0,0,0.05)] relative z-20">
    <h2 className="font-sans text-4xl font-bold mb-2 text-gray-900">{title}</h2>
    <p className="text-xl text-gray-500 mb-8 font-serif italic">{subtitle}</p>
    {children}
  </section>
);

const PlaceholderChart = ({ label }: { label?: string }) => (
  <div className="w-full max-w-3xl h-[350px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 font-medium">
    [ {label || "Visualization Area"} ]
  </div>
);
