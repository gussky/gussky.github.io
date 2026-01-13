import { useEffect, useRef, useState, useMemo } from 'react';
import LinkedD3Dashboard from './D3LinkedDashboard.tsx';
import Visualization1 from './Visualization1.tsx';
import Visualization2 from './Visualization2.tsx';
import Quiz from './Quiz.tsx';
import RadarComparison from '../components/RadarComparison';
import meatFishEggsDataRaw from './assets/category_fish_meat_eggs.json';
import additiveNetworkData from './assets/additive_network.json';
import ScatterMatrix from "../components/ScatterD3"; // adjust path if your file is in pages/ or src/

// --- CONFIGURATION ---
const MAP_SCALE = 0.85;

const QUIZ_PRODUCTS = [
    { id: 1, name: "Fresh Salmon Fillet", category: "Fish Meat Eggs", correct: "A" },
    { id: 2, name: "Processed Ham Slices", category: "Fish Meat Eggs", correct: "D" },
    { id: 3, name: "Frozen Fish Sticks", category: "Fish Meat Eggs", correct: "E" },
    { id: 4, name: "Organic Eggs", category: "Fish Meat Eggs", correct: "A" },
];

// Segment configuration for scroll progress (9 segments for 9 gaps)
const SEGMENT_CONFIG = [
    { id: 'quiz_to_intro', start: 0.00, end: 0.11 },
    { id: 'intro_to_produce', start: 0.11, end: 0.22 },
    { id: 'produce_to_meat',  start: 0.22, end: 0.33 },
    { id: 'meat_to_additives', start: 0.33, end: 0.44 },
    { id: 'additives_to_dairy', start: 0.44, end: 0.56 },
    { id: 'dairy_to_map',     start: 0.56, end: 0.67 },
    { id: 'map_to_dash',      start: 0.67, end: 0.78 },
    { id: 'dash_to_radar',    start: 0.78, end: 0.89 },
    { id: 'radar_to_quiz',    start: 0.89, end: 1.00 },
];

// Helper Components
const MapShelf = ({ className, label, ...props }: any) => (
    <div className={`absolute rounded flex items-center justify-center text-white font-bold font-sans text-sm z-10 shadow-sm ${className}`} {...props}>
        {label}
    </div>
);

const AisleV = ({ label, className, ...props }: any) => (
    <div className={`rounded absolute w-[40px] h-[140px] bg-amber-400 top-[130px] font-sans flex items-center justify-center text-[10px] tracking-widest font-bold text-black/40 shadow-sm [writing-mode:vertical-rl] rotate-180 ${className}`} {...props}>
        {label}
    </div>
);

const AisleH = ({ label, className, ...props }: any) => (
    <div className={`rounded absolute h-[40px] w-[140px] bg-amber-400 font-sans flex items-center justify-center text-[10px] tracking-widest font-bold text-black/40 shadow-sm ${className}`} {...props}>
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
    
    // Chapter 2 (Meat & Fish) scroll pinning state
    const chapter2SectionRef = useRef<HTMLDivElement>(null);
    const chapter2SpacerRef = useRef<HTMLDivElement>(null);
    const [chapter2ScrollProgress, setChapter2ScrollProgress] = useState(0);
    const containerTopAtStickyRef = useRef<number | null>(null);
    
    // Transform meat/fish/eggs data for Visualization1 - this file already contains only meat/fish/eggs products with full nutritional data
    const transformedFoodData = useMemo(() => {
        return (meatFishEggsDataRaw as any[]).map((item, index) => ({
            id: index,
            productName: item.product_name || `Product ${index}`,
            shortName: item.short_name || item.product_name?.substring(0, 20) || `Product ${index}`,
            grade: (item.nutriscore_grade || 'c').toUpperCase(),
            category: item.pnns_groups_2 || item.main_category || 'Unknown',
            brand: item.brands || '',
            additives: item.additives_n || 0,
            energy: item.energy_kcal || 0,
            protein: item.proteins || 0,
            sugar: item.sugars || 0,
            fat: item.fat || 0,
            saturatedFat: item.saturated_fat || 0,
            carbohydrates: item.carbohydrates || 0,
            fiber: item.fiber || 0,
            sodium: item.sodium || 0,
            // Additional metadata
            nova: item.nova_group?.toString() || '',
            nutriscore_score: item.nutriscore_score || 0,
            additives_en: item.additives_en || '',
            main_category: item.main_category || '',
            // Keep original data for reference
            ...item
        }));
    }, []);

    // --- CHAPTER 2 SCROLL PINNING LOGIC ---
    useEffect(() => {
        const handleChapter2Scroll = () => {
            if (!chapter2SectionRef.current || !chapter2SpacerRef.current) return;
            
            const spacer = chapter2SpacerRef.current; // This is the container
            const section = chapter2SectionRef.current; // This is the sticky element
            const winHeight = window.innerHeight;
            
            // Padding configuration: lock periods to analyze charts
            const paddingBefore = winHeight * 1.5; // 150vh lock before animation starts (analyze stage 1)
            const animationHeight = winHeight * 2; // 200vh for fast animation between stages (reduced from 300vh)
            
            // Get positions relative to viewport
            const containerRect = spacer.getBoundingClientRect();
            const sectionRect = section.getBoundingClientRect();
            
            const sectionTop = sectionRect.top;
            const containerTop = containerRect.top;
            
            // Progress calculation with lock periods:
            // - Progress stays at 0 during paddingBefore (LOCK: user analyzes stage 1)
            // - Progress goes from 0 to 1 during animationHeight (FAST: transitions between stages)
            // - Progress stays at 1 during paddingAfter (LOCK: user analyzes stage 3)
            
            if (sectionTop > 0) {
                // Section hasn't reached viewport top yet - not fully visible, progress = 0
                containerTopAtStickyRef.current = null; // Reset tracking
                setChapter2ScrollProgress(0);
            } else {
                // Section is sticky (sectionTop <= 0)
                // Track the containerTop when section first becomes sticky (sectionTop ≈ 0)
                // This is when we start the lock period for stage 1
                if (containerTopAtStickyRef.current === null && sectionTop <= 0 && sectionTop >= -10) {
                    // Section just became sticky - record containerTop at this moment
                    // This marks the start of the lock period
                    containerTopAtStickyRef.current = containerTop;
                }
                
                if (containerTopAtStickyRef.current !== null) {
                    // Calculate how much we've scrolled from when section became sticky
                    // This is the total scroll distance within the pinned section
                    const scrollFromSticky = containerTopAtStickyRef.current - containerTop;
                    
                    // Map scroll distance to progress with lock periods:
                    // - 0 to paddingBefore: progress = 0 (LOCK at stage 1 - analyze chart)
                    // - paddingBefore to paddingBefore + animationHeight: progress = 0 to 1 (FAST animation)
                    // - paddingBefore + animationHeight to end: progress = 1 (LOCK at stage 3 - analyze chart)
                    
                    if (scrollFromSticky <= paddingBefore) {
                        // Still in lock period before - keep progress locked at 0
                        // User can analyze stage 1 (Dendrogram)
                        setChapter2ScrollProgress(0);
                    } else if (scrollFromSticky < paddingBefore + animationHeight) {
                        // In animation range - fast transition between stages
                        const animationScroll = scrollFromSticky - paddingBefore;
                        const progress = animationScroll / animationHeight;
                        setChapter2ScrollProgress(Math.max(0, Math.min(1, progress)));
                    } else {
                        // Past animation - lock at stage 3
                        // User can analyze stage 3 (Parallel Coordinates)
                        setChapter2ScrollProgress(1);
                    }
                } else {
                    // Section is sticky but we haven't recorded the start point yet
                    // Keep progress at 0 until we record it
                    setChapter2ScrollProgress(0);
                }
            }
        };
        
        window.addEventListener('scroll', handleChapter2Scroll, { passive: true });
        window.addEventListener('resize', handleChapter2Scroll);
        handleChapter2Scroll();
        
        return () => {
            window.removeEventListener('scroll', handleChapter2Scroll);
            window.removeEventListener('resize', handleChapter2Scroll);
        };
    }, []);
    
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
                     style={{ transform: `scale(${MAP_SCALE})` }}>

                    <MapShelf label="DAIRY" className="bg-green-500 top-[105px] left-[20px] w-[80px] h-[250px]" />
                    <MapShelf label="MEAT & FISH" className="bg-red-500 top-[20px] left-[20px] w-[760px] h-[60px]" />
                    <MapShelf label="BEVERAGES" className="bg-blue-400 top-[105px] right-[20px] w-[100px] h-[300px]" />

                    <AisleV label="READY TO EAT" className="left-[180px]" />
                    <AisleV label="CANS" className="left-[280px]" />
                    <AisleV label="SAUCES" className="left-[450px]" />
                    <AisleV label="OIL/BUTTER" className="left-[550px]" />

                    <AisleH label="SNACKS" className="top-[330px] left-[215px]"/>
                    <AisleH label="SNACKS" className="top-[330px] left-[415px]"/>
                    <AisleH label="SNACKS" className="top-[410px] left-[215px]"/>
                    <AisleH label="SNACKS" className="top-[410px] left-[415px]"/>

                    <MapShelf label="CHECKOUT" className="bg-purple-500 top-auto bottom-[20px] left-[250px] w-[300px] h-[50px]" />

                    <div className="absolute bottom-[20px] left-[20px] font-bold font-sans text-gray-500 text-sm">ENTRANCE</div>
                    <div className="absolute bottom-[20px] right-[20px] font-bold font-sans text-gray-500 text-sm">EXIT</div>

                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        <path ref={pathRef} d="M 60 600 L 60 400 L 130 400 L 130 100 L 250 100 L 250 300 L 350 300 L 350 100 L 420 100 L 420 300 L 520 300 L 520 100 L 650 100 L 650 390 L 180 390 L 180 510 L 765 510 L 765 575" fill="none" stroke="none"/>
                    </svg>

                    <div ref={cartRef} className="absolute w-[30px] h-[36px] z-20 origin-center transition-transform duration-100 ease-linear">
                        <svg viewBox="0 0 50 60" className="w-full h-full drop-shadow-md text-red-600 fill-current">
                            <rect x="10" y="10" width="30" height="40" rx="3" />
                            <line x1="10" y1="45" x2="40" y2="45" stroke="white" strokeWidth="2" />
                            <rect x="5" y="50" width="40" height="5" className="fill-gray-800" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* --- SCROLLING CONTENT --- */}
            <div className="relative z-10 w-full">

                {/* 0. PRE-QUIZ (CHECK-IN) */}
                <Section title="Check-in" subtitle="Before we show you the data, can you guess the Nutri-Score of these common products?">
                    <Quiz
                        title=""
                        description=""
                        answers={preAnswers}
                        onAnswerChange={(id, grade) => setPreAnswers(prev => ({ ...prev, [id]: grade }))}
                        isSubmitted={false}
                        showResults={false}
                        preAnswers={undefined}
                    />
                </Section>

                <div ref={el => { gapRefs.current[0] = el; }} className="w-full h-[75vh] pointer-events-none" />

                {/* 1. INTRO */}
                <Section title="The Food Journey" subtitle="Scroll down to shop." />

                <div ref={el => { gapRefs.current[1] = el; }} className="w-full h-[75vh] pointer-events-none" />

                {/* 2. PRODUCE */}
                <Section title="1. Produce Section" subtitle="Fresh fruits and vegetables.">
                    <PlaceholderChart label="Produce Analysis" />
                </Section>

                <div ref={el => { gapRefs.current[2] = el; }} className="w-full h-[75vh] pointer-events-none" />

                {/* 3. MEAT & FISH - PINNED SECTION */}
                {/* Container that creates scroll distance - the sticky section will pin inside this */}
                {/* Height: 150vh lock before + 200vh fast animation + 150vh lock after = 500vh total */}
                <div 
                    ref={chapter2SpacerRef}
                    className="relative w-full bg-transparent"
                    style={{ height: '500vh' }} // Total scroll distance with lock periods
                >
                    {/* Sticky section - pins when container reaches viewport top */}
                    <div
                        ref={chapter2SectionRef}
                        className="sticky top-0 w-full z-30"
                        style={{ 
                            minHeight: '100vh'
                        }}
                    >
                        <Section title="2. Meat & Fish" subtitle="Proteins and seafood.">
                            <div className="w-full max-w-[2200px] h-[800px]">
                                <Visualization1
                                    data={transformedFoodData}
                                    scrollProgress={chapter2ScrollProgress}
                                    onComplete={() => {
                                        // Visualization complete - scrolling will continue naturally
                                    }}
                                />
                            </div>
                        </Section>
                    </div>
                </div>

                <div ref={el => { gapRefs.current[3] = el; }} className="w-full h-[75vh] pointer-events-none" />

                {/* 3. ADDITIVES - Visualization2 */}
                <Section title="3. Additives" subtitle="Exploring co-occurrence patterns in food additives.">
                    <div className="w-full max-w-[2200px] h-[800px]">
                        <Visualization2 data={additiveNetworkData} />
                    </div>
                </Section>

                <div ref={el => { gapRefs.current[4] = el; }} className="w-full h-[75vh] pointer-events-none" />

               {/* 4. DAIRY */}
<Section title="3. Dairy Aisle" subtitle="A closer look into the nutrition content of milk, cheese, yogurt and other dairy products.">
  {/* replace PlaceholderChart with the scatter matrix component */}
  <div style={{ minHeight: 360 }}>
    <ScatterMatrix />
  </div>
</Section>

                <div ref={el => { gapRefs.current[5] = el; }} className="w-full h-[75vh] pointer-events-none" />

                {/* --- 5. FROSTED GLASS / MAPPING THE LANDSCAPE --- */}
                <section className="min-h-screen flex flex-col justify-center w-full py-24
                                    bg-white/80 backdrop-blur-md border-y border-white/40 backdrop-filter
                                    shadow-lg z-20">
                    <div className="max-w-2xl mx-auto px-6">
                        <h2 className="font-sans text-4xl font-bold mb-6 text-gray-900">
                            4. Mapping the Landscape
                        </h2>
                        <p className="text-lg text-gray-900 mb-6 font-medium">
                            As we leave the physical aisles, a new map emerges.
                            By analyzing ingredients mathematically, we can group food by nutritional similarity rather than store category.
                        </p>
                        <p className="text-lg text-gray-900 font-medium">
                            Below, explore two views: <strong className="bg-white/50 px-1 rounded">Nutri-Score</strong> vs <strong className="bg-white/50 px-1 rounded">NOVA</strong> (Processing).
                            Notice how products clump together based on their hidden "Nutritional DNA."
                        </p>
                    </div>
                </section>

                <div ref={el => { gapRefs.current[6] = el; }} className="w-full h-[75vh] pointer-events-none" />

                {/* --- 6. LINKED DASHBOARD --- */}
                {/* Replaces Checkout Section */}
                <Section title="Mapping the Landscape" subtitle="Explore the data below.">
                    <LinkedD3Dashboard />
                </Section>

                <div ref={el => { gapRefs.current[7] = el; }} className="w-full h-[75vh] pointer-events-none" />

                {/* RADAR COMPARISON (Twins Section) - Before the final quiz */}
                <RadarComparison />

                <div ref={el => { gapRefs.current[8] = el; }} className="w-full h-[75vh] pointer-events-none" />

                {/* POST-QUIZ (CHECKOUT) - After exploring all visualizations including the full picture */}
                <Section title="Final Check-out" subtitle="Now that you've explored the visualizations, rank the same products again to see if your understanding has changed.">
                    <Quiz
                        title=""
                        description=""
                        answers={postAnswers}
                        onAnswerChange={(id, grade) => {
                            setPostAnswers(prev => ({ ...prev, [id]: grade }));
                            const newAnswers = { ...postAnswers, [id]: grade };
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