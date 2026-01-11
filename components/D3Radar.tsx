import React, { useState, useRef, useMemo } from "react";
import * as d3 from "d3";

// --- Configuration ---
const FEATURES = [
  "Sugar",
  "Protein",
  "Fiber",
  "Sodium",
  "Carbohydrates",
  "Sat. Fat",
];
const SIZE = 400;
const MARGIN = 40;
const RADIUS = SIZE / 2 - MARGIN;
const MAX_VALUE = 10;

export default function D3Radar() {
  // State: The 6 values (0-10)
  const [data, setData] = useState<number[]>(
    new Array(FEATURES.length).fill(5)
  );
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // --- 1. D3 SCALES & GENERATORS ---
  // We use useMemo so D3 doesn't re-calculate these on every render unless dimensions change

  const { rScale, angleScale, radarLineGenerator } = useMemo(() => {
    // Radial Scale: Maps input (0-10) -> output (0-RADIUS pixels)
    const rScale = d3.scaleLinear().domain([0, MAX_VALUE]).range([0, RADIUS]);

    // Angle Scale: Maps index (0-5) -> Angle in radians
    const angleScale = d3
      .scaleLinear()
      .domain([0, FEATURES.length])
      .range([0, 2 * Math.PI]);

    // Line Generator: Creates the SVG path string "M100,200 L..."
    const radarLineGenerator = d3
      .lineRadial<number>()
      .angle((d, i) => angleScale(i))
      .radius((d) => rScale(d))
      .curve(d3.curveLinearClosed); // Closes the shape automatically

    return { rScale, angleScale, radarLineGenerator };
  }, []);

  // --- 2. INTERACTION LOGIC ---
  // We keep the "Magnet" logic because it's cleaner than dragging tiny dots
  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (!svgRef.current) return;

    // Get coordinates relative to center (0,0)
    const rect = svgRef.current.getBoundingClientRect();
    const clientX =
      "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY =
      "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const centerX = rect.left + SIZE / 2;
    const centerY = rect.top + SIZE / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;

    // Calculate Angle & Distance
    // Note: D3's 0 angle is at 12 o'clock, but Math.atan2 starts at 3 o'clock
    // We adjust by adding PI/2 to rotate it standard
    let angle = Math.atan2(dy, dx) + Math.PI / 2;
    if (angle < 0) angle += 2 * Math.PI;

    const distance = Math.sqrt(dx * dx + dy * dy);

    // Find the closest axis index
    // We normalize the angle to the number of features
    const index =
      Math.round(angle / ((2 * Math.PI) / FEATURES.length)) % FEATURES.length;

    // Update Data
    // Clamp value between 0 and 10 using the scale's invert function is possible,
    // but simple math is often safer for interactions:
    const rawValue = rScale.invert(distance);
    const newValue = Math.max(0, Math.min(MAX_VALUE, rawValue));

    const newData = [...data];
    newData[index] = newValue;
    setData(newData);
  };

  // --- 3. RENDERING HELPERS ---

  // Generate grid circles (2, 4, 6, 8, 10)
  const gridCircles = [2, 4, 6, 8, 10].map((val) => (
    <circle
      key={val}
      cx={0}
      cy={0}
      r={rScale(val)}
      fill="none"
      stroke="#e5e7eb"
      strokeWidth="1"
    />
  ));

  // Generate Axis Lines
  const axisLines = FEATURES.map((label, i) => {
    const angle = angleScale(i) - Math.PI / 2; // Adjust for SVG standard rotation
    const x = Math.cos(angle) * RADIUS;
    const y = Math.sin(angle) * RADIUS;
    return (
      <g key={i}>
        <line x1={0} y1={0} x2={x} y2={y} stroke="#e5e7eb" strokeWidth="1" />
        {/* Label Text */}
        <text
          x={x * 1.15}
          y={y * 1.15}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xs font-bold fill-gray-600 select-none"
        >
          {label}
        </text>
      </g>
    );
  });

  return (
    <div className="flex flex-col md:flex-row items-center w-full min-h-[600px] bg-white p-8">
      {/* Left: Instructions */}
      <div className="w-full md:w-1/2 p-4">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          Define "Healthy"
        </h2>
        <p className="text-gray-600 mb-6">
          Using{" "}
          <span className="font-mono text-blue-600 bg-blue-50 px-1 rounded">
            D3.js
          </span>{" "}
          scales and shape generators.
          <br />
          Click and drag on the chart to sketch your ideal nutritional profile.
        </p>
        <div className="bg-gray-50 p-4 rounded border">
          <p className="font-semibold text-gray-700">Current Values:</p>
          <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-600">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex justify-between">
                <span>{f}:</span>
                <span className="font-mono">{data[i].toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: The D3 Chart */}
      <div className="w-full md:w-1/2 flex justify-center">
        <svg
          ref={svgRef}
          width={SIZE}
          height={SIZE}
          className="cursor-crosshair select-none"
          // Interaction Events
          onMouseDown={(e) => {
            setIsDragging(true);
            handleInteraction(e);
          }}
          onMouseMove={(e) => {
            if (isDragging) handleInteraction(e);
          }}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          onTouchStart={(e) => {
            setIsDragging(true);
            handleInteraction(e);
          }}
          onTouchMove={(e) => {
            if (isDragging) handleInteraction(e);
          }}
          onTouchEnd={() => setIsDragging(false)}
        >
          {/* Shift coordinate system to center so (0,0) is the middle */}
          <g transform={`translate(${SIZE / 2}, ${SIZE / 2})`}>
            {/* 1. Grid & Axes */}
            {gridCircles}
            {axisLines}

            {/* 2. The Radar Shape (Generated by D3) */}
            <path
              d={radarLineGenerator(data) || ""}
              fill="rgba(59, 130, 246, 0.4)"
              stroke="#2563eb"
              strokeWidth="3"
              strokeLinejoin="round"
            />

            {/* 3. Interactive Handles */}
            {data.map((val, i) => {
              // We recalculate point positions manually just for the dots
              // or we could use D3 symbols. Manual is often simpler for simple dots.
              const angle = angleScale(i) - Math.PI / 2;
              const r = rScale(val);
              const x = Math.cos(angle) * r;
              const y = Math.sin(angle) * r;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={6}
                  fill="#2563eb"
                  className="hover:r-8 transition-all"
                />
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
