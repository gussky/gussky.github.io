import React from 'react';

const NovaIntroSection: React.FC = () => {
    return (
        <div className="w-full max-w-7xl mx-auto font-serif text-gray-800">

            {/* 1. The Hook: Transition from Previous Map */}
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-extrabold mb-6 text-gray-900 font-sans tracking-tight">
                    Wait, there's a catch.
                </h2>
                <p className="text-xl md:text-2xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
                    You've just explored the "Nutritional Landscape." You clicked dots, found healthier alternatives, and saw how Nutri-Score grades products based on sugar, fat, and salt.
                </p>
            </div>

            {/* 2. The Concept: Introducing NOVA */}
            <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
                <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-gray-900 font-sans">
                        It's not just <span className="italic text-blue-600">what</span> you eat, but <span className="italic text-red-600">how</span> it's made.
                    </h3>
                    <p className="text-lg text-gray-700 leading-relaxed">
                        A <strong>fresh orange</strong> and a <strong>vitamin-fortified orange soda</strong> might look surprisingly similar to a simple algorithm calculating sugar and vitamins. They might even get similar Nutri-Scores.
                    </p>
                    <p className="text-lg text-gray-700 leading-relaxed">
                        This is where <strong>NOVA</strong> comes in. Unlike Nutri-Score (which looks at nutrients), NOVA looks at <strong>processing</strong>.
                    </p>
                </div>

                {/* Visual Aid: Simple NOVA Card */}
                <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-4">
                        <span className="w-12 h-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xl font-sans">1</span>
                        <div>
                            <div className="font-bold text-gray-900 font-sans">Unprocessed / Minimally Processed</div>
                            <div className="text-sm text-gray-500">Fruits, veggies, eggs, milk. Real food.</div>
                        </div>
                    </div>
                    <div className="h-8 border-l-2 border-dashed border-gray-200 ml-6"></div>
                    <div className="flex items-center gap-4">
                        <span className="w-12 h-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xl font-sans">2</span>
                        <div>
                            <div className="font-bold text-gray-900 font-sans">Culinary Ingredients</div>
                            <div className="text-sm text-gray-500">Salt, Sugar, Honey, Vinegar</div>
                        </div>
                    </div>
                    <div className="h-8 border-l-2 border-dashed border-gray-200 ml-6"></div>
                    <div className="flex items-center gap-4">
                        <span className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold text-xl font-sans">3</span>
                        <div>
                            <div className="font-bold text-gray-900 font-sans">Processed</div>
                            <div className="text-sm text-gray-500">Canned veggies, cheese, fresh bread.</div>
                        </div>
                    </div>
                    <div className="h-8 border-l-2 border-dashed border-gray-200 ml-6"></div>
                    <div className="flex items-center gap-4">
                        <span className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xl font-sans">4</span>
                        <div>
                            <div className="font-bold text-gray-900 font-sans">Ultra-Processed (UPF)</div>
                            <div className="text-sm text-gray-500">Formulations of ingredients. Soda, snacks, nuggets.</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. The Bridge to Sankey */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-8 rounded-r-xl">
                <h3 className="text-xl font-bold text-blue-900 font-sans mb-3">
                    The "Ultra-Processed Health Food" Paradox
                </h3>
                <p className="text-blue-800 text-lg leading-relaxed">
                    Here is the million-dollar question: <strong>Can a product have a perfect 'A' rating but still be Ultra-Processed?</strong>
                </p>
                <p className="text-blue-800/70 mt-4 text-base">
                    Scroll down to trace the flow. Watch how thousands of products move from "Healthy Grades" into "Ultra-Processed" territory.
                </p>
            </div>

            <div className="flex justify-center mt-12">
                <div className="animate-bounce text-gray-300">
                    ↓
                </div>
            </div>
        </div>
    );
};

export default NovaIntroSection;