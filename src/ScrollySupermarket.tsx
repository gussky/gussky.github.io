import {useEffect, useRef, useState} from 'react';
import LinkedD3Dashboard from './D3LinkedDashboard.tsx';
import Visualization2 from './Visualization2.tsx';
import Quiz from './Quiz.tsx';
import additiveNetworkData from './assets/additive_network.json';
import ScatterMatrix from "../components/ScatterD3";
import NutrientComposition from "../components/NutrientComposition";
import NutriNovaSankey from "./NutriNovaSankey.tsx";
import NutriNovaIntroSection from "./NutriNovaIntroSection.tsx";
import NutrientComparison from "./NutrientComparison.tsx";

// --- CONFIGURATION ---
const MAP_SCALE = 0.85;

const QUIZ_PRODUCTS = [
    {id: 1, name: "High protein shake bananas & cream", category: "Beverages", correct: "B"},
    {id: 2, name: "Toasted multi-grain cereal with almonds & honey oat clusters", category: "Cereals", correct: "D"},
    {id: 3, name: "Frozen Fish Sticks", category: "Fish Meat Eggs", correct: "E"},
    {id: 4, name: "Organic Eggs", category: "Fish Meat Eggs", correct: "A"},
];

// Segment configuration for scroll progress (9 segments for 9 gaps)
const SEGMENT_CONFIG = [
    {id: 'quiz_to_intro', start: 0.00, end: 0.11},
    {id: 'intro_to_produce', start: 0.11, end: 0.22},
    {id: 'produce_to_meat', start: 0.22, end: 0.33},
    {id: 'meat_to_additives', start: 0.33, end: 0.44},
    {id: 'additives_to_dairy', start: 0.44, end: 0.56},
    {id: 'dairy_to_map', start: 0.56, end: 0.67},
    {id: 'map_to_dash', start: 0.67, end: 0.78},
    {id: 'dash_to_radar', start: 0.78, end: 0.89},
    {id: 'radar_to_quiz', start: 0.89, end: 1.00},
];

// Helper Components
const MapShelf = ({className, label, ...props}: any) => (
    <div
        className={`absolute rounded flex items-center justify-center text-white font-bold font-sans text-sm z-10 shadow-sm ${className}`} {...props}>
        {label}
    </div>
);

const AisleV = ({label, className, ...props}: any) => (
    <div
        className={`rounded absolute w-[40px] h-[140px] bg-amber-400 top-[130px] font-sans flex items-center justify-center text-[10px] tracking-widest font-bold text-black/40 shadow-sm [writing-mode:vertical-rl] rotate-180 ${className}`} {...props}>
        {label}
    </div>
);

const AisleH = ({label, className, ...props}: any) => (
    <div
        className={`rounded absolute h-[40px] w-[140px] bg-amber-400 font-sans flex items-center justify-center text-[10px] tracking-widest font-bold text-black/40 shadow-sm ${className}`} {...props}>
        {label}
    </div>
);

export default function ScrollySupermarket() {
    const [pathProgress, setPathProgress] = useState(0);
    const gapRefs = useRef<Array<HTMLDivElement | null>>([]);
    const cartRef = useRef<HTMLDivElement>(null);
    const pathRef = useRef<SVGPathElement>(null);

    // Quiz state
    const [preAnswers, setPreAnswers] = useState<Record<number, string>>({});
    const [postAnswers, setPostAnswers] = useState<Record<number, string>>({});
    const [postQuizSubmitted, setPostQuizSubmitted] = useState(false);
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
                const rawProgress = (startPixel - currentPixel) / (startPixel - endPixel);

                if (rawProgress < 0) {
                    break;
                } else if (rawProgress >= 0 && rawProgress <= 1) {
                    const range = segment.end - segment.start;
                    calculatedP = segment.start + (rawProgress * range);
                    break;
                } else {
                    calculatedP = segment.end;
                }
            }
            setPathProgress(calculatedP);
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
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
        const angle = Math.atan2(nextPt.y - pt.y, nextPt.x - pt.x) * (180 / Math.PI) + 90;

        cartRef.current.style.left = `${pt.x - 15}px`;
        cartRef.current.style.top = `${pt.y - 18}px`;
        cartRef.current.style.transform = `rotate(${angle}deg)`;
    }, [pathProgress]);

    return (
        <div className="relative w-full">

            {/* --- FIXED MAP BACKGROUND --- */}
            <div className="fixed inset-0 z-0 bg-[#fdfbf7] flex items-center justify-center">
                <div className="relative w-[800px] h-[600px] origin-center transition-transform duration-75"
                     style={{transform: `scale(${MAP_SCALE})`}}>

                    <MapShelf label="DAIRY" className="bg-green-500 top-[105px] left-[20px] w-[80px] h-[250px]"/>
                    <MapShelf label="MEAT & FISH" className="bg-red-500 top-[20px] left-[20px] w-[760px] h-[60px]"/>
                    <MapShelf label="BEVERAGES" className="bg-blue-400 top-[105px] right-[20px] w-[100px] h-[300px]"/>

                    <AisleV label="READY TO EAT" className="left-[180px]"/>
                    <AisleV label="CANS" className="left-[280px]"/>
                    <AisleV label="SAUCES" className="left-[450px]"/>
                    <AisleV label="OIL/BUTTER" className="left-[550px]"/>

                    <AisleH label="SNACKS" className="top-[330px] left-[215px]"/>
                    <AisleH label="SNACKS" className="top-[330px] left-[415px]"/>
                    <AisleH label="SNACKS" className="top-[410px] left-[215px]"/>
                    <AisleH label="SNACKS" className="top-[410px] left-[415px]"/>

                    <MapShelf label="CHECKOUT"
                              className="bg-purple-500 top-auto bottom-[20px] left-[250px] w-[300px] h-[50px]"/>

                    <div
                        className="absolute bottom-[20px] left-[20px] font-bold font-sans text-gray-500 text-sm">ENTRANCE
                    </div>
                    <div
                        className="absolute bottom-[20px] right-[20px] font-bold font-sans text-gray-500 text-sm">EXIT
                    </div>

                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        <path ref={pathRef}
                              d="M 60 600 L 60 400 L 130 400 L 130 100 L 250 100 L 250 300 L 350 300 L 350 100 L 420 100 L 420 300 L 520 300 L 520 100 L 650 100 L 650 390 L 180 390 L 180 510 L 765 510 L 765 575"
                              fill="none" stroke="none"/>
                    </svg>

                    <div ref={cartRef}
                         className="absolute w-[30px] h-[36px] z-20 origin-center transition-transform duration-100 ease-linear">
                        <svg viewBox="0 0 50 60" className="w-full h-full drop-shadow-md text-red-600 fill-current">
                            <rect x="10" y="10" width="30" height="40" rx="3"/>
                            <line x1="10" y1="45" x2="40" y2="45" stroke="white" strokeWidth="2"/>
                            <rect x="5" y="50" width="40" height="5" className="fill-gray-800"/>
                        </svg>
                    </div>
                </div>
            </div>

            {/* --- SCROLLING CONTENT --- */}
            <div className="relative z-10 w-full">

                {/* 0. PRE-QUIZ (CHECK-IN) */}
                <Section title="Check-in"
                         subtitle="Before we show you the data, can you guess the Nutri-Score of these common products?">
                    <Quiz
                        title=""
                        description=""
                        answers={preAnswers}
                        onAnswerChange={(id, grade) => setPreAnswers(prev => ({...prev, [id]: grade}))}
                        isSubmitted={false}
                        showResults={false}
                        preAnswers={undefined}
                    />
                </Section>

                <div ref={el => {
                    gapRefs.current[0] = el;
                }} className="w-full h-[75vh] pointer-events-none"/>

                {/* 2. INTRO */}
                <Section title="The Food Journey" subtitle="Scroll down to shop."/>

                <div ref={el => {
                    gapRefs.current[1] = el;
                }} className="w-full h-[75vh] pointer-events-none"/>

                {/* 1. nutri calc */}
                <Section
                    title="What are Nutri-Scores and Nutri-Grades?"
                    subtitle="Understand how each nutrient is associated with negative and positive points that combine to produce grades A–E"
                >
                    <div className="flex flex-col items-center">

                        <div className="text-lg text-gray-900 font-medium max-w-[1200px] w-full text-justify">
                            <p>
                                Ever wondered why two foods can share the same Nutri-Grade even when their nutrient
                                profiles look very different?
                                Nutri-Score reflects nutritional quality by converting nutrient content into points.
                                Negative points are assigned for energy, sugars,
                                saturated fats, and sodium, while positive points are assigned for protein, fiber, and
                                fruit/vegetable/nut content. The final
                                Nutri-Score is computed as the difference between these totals (Negative points −
                                Positive points), and the resulting value is
                                mapped to the A–E grade bands.
                                Lower Nutri-Score values (more negative) correspond to better grades (A, B) and
                                healthier products, while higher values (more positive) lead to worse grades (C, D, E),
                                labeling the products unhealthy.
                            </p>
                            <br/>
                            <p>
                                This plot visualizes how each nutrient contributes to Nutri-Score calculation. For each
                                Nutri-Grade on the y-axis, the stacked bar on the right of 0th mark
                                shows the average negative-point composition of the nutrients, and the stacked bar on
                                the left shows the average positive-point composition.
                                The black diamond (♦) marks the average Nutri-Score value across all products for each
                                Nutri-Grade.
                            </p>
                            <br/>
                            <p>
                                Observe the chart from A to E: Grade A mostly shows larger positive contributions (from
                                healthier nutrients) and a net score that remains on the
                                negative side, while Grades B and C reflect a more intermediate balance as the influence
                                of negative nutrients increase and positives
                                decline. For Grades D and E, negative components dominate and the net score rises into
                                the highest bands, making the product "unhealthy".
                                Hover over any segment to view the nutrient's average contribution to that Nutri-Grade
                                and find out which nutrients account for the differences between grades.
                            </p>
                        </div>
                    </div>

                    <div className="w-full">
                        <NutrientComposition/>
                    </div>
                </Section>

                <div ref={el => {
                    gapRefs.current[2] = el;
                }} className="w-full h-[75vh] pointer-events-none"/>

                {/* RADAR COMPARISON (Twins Section) - Before the final quiz */}
                <Section>
                    <NutrientComparison />
                </Section>

                <div ref={el => {
                    gapRefs.current[3] = el;
                }} className="w-full h-[75vh] pointer-events-none"/>


                {/* 4. DAIRY */}
                <Section title="Dairy Aisle"
                         subtitle="A closer look into the nutrition content of milk, cheese, yogurt and other dairy products.">
                    <ScatterMatrix/>
                </Section>

                <div ref={el => {
                    gapRefs.current[4] = el;
                }} className="w-full h-[75vh] pointer-events-none"/>

                <Section>
                    <NutriNovaIntroSection />
                    <NutriNovaSankey />
                </Section>

                <div ref={el => {
                    gapRefs.current[5] = el;
                }} className="w-full h-[75vh] pointer-events-none"/>

                {/* 3. ADDITIVES - Visualization2 */}
                <Section title="Additives" subtitle="What's really inside these ultra-processed foods? Discover the hidden network of additives."> 
                    <div className="text-sm text-gray-600 mb-6 max-w-3xl text-center space-y-2">
                        <p><strong>How to explore:</strong></p>
                        <ul className="text-left inline-block space-y-1">
                            <li>• <strong>Click</strong> any node to view its Nutri-Score distribution across NOVA groups</li>
                            <li>• <strong>Hover</strong> over connections to see which additives co-occur together</li>
                            <li>• <strong>Switch views</strong> using the Cluster/Grade toggle to organize by function or nutritional quality</li>
                            <li>• <strong>Draw your prediction</strong> in the side panel to guess the grade distribution, then reveal the answer</li>
                            <li>• <strong>Filter by brand</strong> to explore additive patterns in specific product lines</li>
                            <li>• <strong>Navigate:</strong> Drag to pan, double-click to zoom, or enable scroll zoom</li>
                        </ul>
                    </div>
                    <div className="w-full h-[850px]" style={{ maxWidth: '100%' }}>
                        <Visualization2 data={additiveNetworkData}/>
                    </div>
                </Section>

                <div ref={el => {
                    gapRefs.current[6] = el;
                }} className="w-full h-[75vh] pointer-events-none"/>

                {/* --- 6. LINKED DASHBOARD --- */}
                <Section title="Beyond the Label: Mapping the Food Landscape">
                    <section className="relative z-10 w-full py-5 bg-white/80 backdrop-blur-md border-y border-white/40">
                        <div className="max-w-3xl mx-auto text-center">
                            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                                Imagine ignoring the marketing on the box and organizing the grocery store based purely on
                                nutritional similarity. By analyzing over 30,000 products, we've created a map where
                                <strong> proximity equals similarity.</strong>
                            </p>

                            <div className="grid md:grid-cols-3 gap-8 text-left mb-8">
                                <div className="bg-white/60 p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                        <span className="bg-red-100 text-red-600 p-1 rounded">⚠️</span> The Processed Trap
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        Notice how "healthy" Nutri-Scores (Green) are sometimes group 4 on the NOVA map. These are
                                        ultra-processed foods engineered to pass the test.
                                    </p>
                                </div>

                                <div className="bg-white/60 p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                        <span className="bg-green-100 text-green-600 p-1 rounded">🌱</span> Shop the perimeter
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        Unprocessed foods (NOVA 1) seem to form distinct, isolated islands, far away from the
                                        dense "continents" of UPFs.
                                    </p>
                                </div>

                                <div className="bg-white/60 p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                        <span className="bg-blue-100 text-blue-600 p-1 rounded">🔍</span> Find Alternatives
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        Click any product dot. Our algorithm will scan the neighborhood to find a
                                        <strong> mathematically similar but healthier</strong> alternative.
                                    </p>
                                </div>
                            </div>

                            <p className="text-sm text-gray-500 font-medium uppercase tracking-widest">
                                Scroll down to explore the map ↓
                            </p>
                        </div>
                    </section>
                    <LinkedD3Dashboard/>
                </Section>

                <div ref={el => {
                    gapRefs.current[7] = el;
                }} className="w-full h-[75vh] pointer-events-none"/>

                {/* POST-QUIZ (CHECKOUT) - After exploring all visualizations including the full picture */}
                <Section title="Final Check-out"
                         subtitle="Now that you've explored the visualizations, rank the same products again to see if your understanding has changed.">
                    <Quiz
                        title=""
                        description=""
                        answers={postAnswers}
                        onAnswerChange={(id, grade) => {
                            setPostAnswers(prev => ({...prev, [id]: grade}));
                            const newAnswers = {...postAnswers, [id]: grade};
                            if (QUIZ_PRODUCTS.every(p => newAnswers[p.id])) {
                                setTimeout(() => setPostQuizSubmitted(true), 500);
                            }
                        }}
                        isSubmitted={postQuizSubmitted}
                        showResults={true}
                        preAnswers={preAnswers}
                    />
                </Section>
            </div>
        </div>
    );
}

// --- SUB-COMPONENTS ---
const Section = ({title, subtitle, children}: any) => (
    // Standard opaque sections for aisles
    <section
        className="min-h-screen bg-white border-y border-gray-100 flex flex-col items-center justify-center py-20 px-5 shadow-[0_0_40px_rgba(0,0,0,0.05)] relative z-20">
        {title && <h2 className="font-sans text-4xl font-bold mb-2 text-gray-900">{title}</h2>}
        {subtitle && <p className="text-xl text-gray-500 mb-8 font-serif italic">{subtitle}</p>}
        {children}
    </section>
);