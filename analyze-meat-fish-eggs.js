import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the food data
const foodDataPath = path.join(__dirname, 'src/assets/food_umap.json');
const foodData = JSON.parse(fs.readFileSync(foodDataPath, 'utf8'));

// Try to load CSV with nutritional data
let csvData = null;
const csvPaths = [
    path.join(__dirname, 'public/interm_food_facts.csv'),
    path.join(__dirname, 'dist/interm_food_facts.csv')
];

for (const csvPath of csvPaths) {
    if (fs.existsSync(csvPath)) {
        console.log(`Loading CSV from: ${csvPath}`);
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const lines = csvContent.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        
        csvData = lines.slice(1).map(line => {
            // Handle CSV parsing (may contain commas in quoted fields)
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim());
            
            const row = {};
            headers.forEach((header, idx) => {
                const value = values[idx] || '';
                row[header] = value.replace(/^"|"$/g, '');
            });
            return row;
        });
        console.log(`Loaded ${csvData.length} rows from CSV`);
        break;
    }
}

if (!csvData) {
    console.log('⚠️  Warning: CSV file not found. Nutritional data will be missing.');
}

console.log(`Total products in dataset: ${foodData.length}`);

// Filter for meat, fish, and eggs category - using the same logic as the app
const meatFishEggsCategories = [
    'Fish Meat Eggs',
    'Meat',
    'Fish',
    'Eggs',
    'Meat products',
    'Fish products',
    'Egg products',
    'fr:viandes',
    'fr:poissons',
    'fr:oeufs'
];

const filtered = foodData.filter(item => {
    const category = (item.category || '').trim();
    const categoryLower = category.toLowerCase();
    const name = (item.name || '').toLowerCase();
    
    // Explicitly exclude false positives
    if (categoryLower.includes('egg-free') || categoryLower.includes('eggfree') || 
        categoryLower.includes('eggplant') || categoryLower.includes('egg-free') ||
        name.includes('egg-free') || name.includes('eggfree') || name.includes('eggplant')) {
        return false;
    }
    
    // Use exact category match or check for word boundaries to avoid false matches
    return meatFishEggsCategories.some(cat => {
        const catLower = cat.toLowerCase();
        // Exact match
        if (categoryLower === catLower) return true;
        // Check if category starts with the target (but not egg-free)
        if ((categoryLower.startsWith(catLower + ' ') || categoryLower.startsWith(catLower + '-')) && 
            !categoryLower.includes('egg-free') && !categoryLower.includes('eggfree')) {
            return true;
        }
        // For "Eggs", check for word boundary - must be actual eggs, not egg-free
        if ((catLower === 'eggs' || catLower === 'egg') && 
            !categoryLower.includes('egg-free') && !categoryLower.includes('eggfree') &&
            !categoryLower.includes('eggplant')) {
            const eggRegex = /\b(eggs?|egg\s|egg-)/i;
            if (eggRegex.test(category)) return true;
        }
        // For "Meat", check word boundaries
        if (catLower === 'meat') {
            const meatRegex = /\bmeat\b/i;
            if (meatRegex.test(category)) return true;
        }
        // For "Fish", check word boundaries
        if (catLower === 'fish') {
            const fishRegex = /\bfish\b/i;
            if (fishRegex.test(category)) return true;
        }
        return false;
    });
});

console.log(`Meat/Fish/Eggs products found: ${filtered.length}`);

// Helper function to find matching CSV row by product name
const findCsvMatch = (productName) => {
    if (!csvData) return null;
    
    const nameLower = (productName || '').toLowerCase().trim();
    
    // Try exact match first
    let match = csvData.find(row => {
        const csvName = (row.product_name || row.name || row.productName || '').toLowerCase().trim();
        return csvName === nameLower;
    });
    
    // Try partial match if exact match fails
    if (!match) {
        match = csvData.find(row => {
            const csvName = (row.product_name || row.name || row.productName || '').toLowerCase().trim();
            return csvName.includes(nameLower) || nameLower.includes(csvName);
        });
    }
    
    return match;
};

// Helper function to parse numeric value from CSV
const parseNumeric = (value) => {
    if (!value || value === '' || value === 'NULL' || value === 'null') return 0;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
};

// Analyze and extract nutritional data
const analyzedProducts = filtered.map((item, index) => {
    const csvRow = findCsvMatch(item.name);
    
    // Extract all nutritional values - prioritize CSV data, fallback to JSON
    const product = {
        id: index,
        productName: item.name || `Product ${index}`,
        category: item.category || 'Unknown',
        grade: (item.nutriscore || 'C').toUpperCase(),
        brand: item.brand || (csvRow ? (csvRow.brand || csvRow.brands || '') : ''),
        
        // Nutritional values - try CSV first, then JSON, then default to 0
        additives: csvRow ? parseNumeric(csvRow.additives_n || csvRow.additives || csvRow.ingredients_n) : (item.ingredients_n || item.additives || 0),
        energy: csvRow ? parseNumeric(csvRow.energy || csvRow.energy_kcal || csvRow.energy_kcal_100g || csvRow['energy-kcal'] || csvRow['energy-kcal_100g']) : (item.energy || item.energy_kcal || 0),
        protein: csvRow ? parseNumeric(csvRow.proteins || csvRow.protein || csvRow.proteins_100g || csvRow.protein_100g) : (item.protein || item.proteins || 0),
        sugar: csvRow ? parseNumeric(csvRow.sugars || csvRow.sugar || csvRow.sugars_100g || csvRow.sugar_100g) : (item.sugar || item.sugars || 0),
        fat: csvRow ? parseNumeric(csvRow.fat || csvRow.fat_100g) : (item.fat || 0),
        saturatedFat: csvRow ? parseNumeric(csvRow['saturated-fat'] || csvRow.saturated_fat || csvRow['saturated-fat_100g'] || csvRow.saturated_fat_100g) : (item.saturatedFat || item.saturated_fat || 0),
        carbohydrates: csvRow ? parseNumeric(csvRow.carbohydrates || csvRow.carbohydrates_100g || csvRow.carbs || csvRow.carbs_100g) : (item.carbohydrates || item.carbs || 0),
        fiber: csvRow ? parseNumeric(csvRow.fiber || csvRow.fibre || csvRow.fiber_100g || csvRow.fibre_100g) : (item.fiber || item.fibre || 0),
        sodium: csvRow ? parseNumeric(csvRow.sodium || csvRow.sodium_100g || csvRow.salt || csvRow.salt_100g) : (item.sodium || 0),
        
        // Additional metadata
        nova: item.nova || (csvRow ? (csvRow.nova || csvRow.nova_group || '') : ''),
        position: item.position || [0, 0],
        ns_color: item.ns_color || [0, 0, 0],
        nova_color: item.nova_color || [0, 0, 0],
        csvMatched: csvRow ? true : false
    };
    
    return product;
});

// Statistics
const stats = {
    totalProducts: foodData.length,
    meatFishEggsProducts: filtered.length,
    byGrade: {},
    byCategory: {},
    nutritionalStats: {
        additives: { min: Infinity, max: -Infinity, avg: 0, count: 0 },
        energy: { min: Infinity, max: -Infinity, avg: 0, count: 0 },
        protein: { min: Infinity, max: -Infinity, avg: 0, count: 0 },
        sugar: { min: Infinity, max: -Infinity, avg: 0, count: 0 },
        fat: { min: Infinity, max: -Infinity, avg: 0, count: 0 },
        saturatedFat: { min: Infinity, max: -Infinity, avg: 0, count: 0 },
        carbohydrates: { min: Infinity, max: -Infinity, avg: 0, count: 0 },
        fiber: { min: Infinity, max: -Infinity, avg: 0, count: 0 },
        sodium: { min: Infinity, max: -Infinity, avg: 0, count: 0 }
    }
};

// Calculate statistics
analyzedProducts.forEach(product => {
    // By grade
    const grade = product.grade;
    stats.byGrade[grade] = (stats.byGrade[grade] || 0) + 1;
    
    // By category
    const cat = product.category;
    stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
    
    // Nutritional stats
    ['additives', 'energy', 'protein', 'sugar', 'fat', 'saturatedFat', 'carbohydrates', 'fiber', 'sodium'].forEach(key => {
        const value = product[key];
        if (value > 0) {
            const stat = stats.nutritionalStats[key];
            stat.min = Math.min(stat.min, value);
            stat.max = Math.max(stat.max, value);
            stat.avg += value;
            stat.count++;
        }
    });
});

// Calculate averages
Object.keys(stats.nutritionalStats).forEach(key => {
    const stat = stats.nutritionalStats[key];
    if (stat.count > 0) {
        stat.avg = stat.avg / stat.count;
    } else {
        stat.min = 0;
        stat.max = 0;
        stat.avg = 0;
    }
});

// Create output object
const output = {
    metadata: {
        generatedAt: new Date().toISOString(),
        sourceFile: 'food_umap.json',
        totalProductsInDataset: stats.totalProducts,
        meatFishEggsProductsCount: stats.meatFishEggsProducts
    },
    statistics: stats,
    products: analyzedProducts
};

// Write to file
const outputPath = path.join(__dirname, 'src/assets/meat_fish_eggs_analysis.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');

console.log('\n=== ANALYSIS RESULTS ===');
console.log(`Total products in dataset: ${stats.totalProducts}`);
console.log(`Meat/Fish/Eggs products: ${stats.meatFishEggsProducts}`);
console.log('\nBy Grade:');
Object.entries(stats.byGrade).sort().forEach(([grade, count]) => {
    console.log(`  Grade ${grade}: ${count} products`);
});
console.log('\nTop 10 Categories:');
Object.entries(stats.byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count} products`);
    });
console.log('\nNutritional Value Ranges:');
Object.entries(stats.nutritionalStats).forEach(([key, stat]) => {
    console.log(`  ${key}: min=${stat.min.toFixed(2)}, max=${stat.max.toFixed(2)}, avg=${stat.avg.toFixed(2)} (${stat.count} products with data)`);
});

console.log(`\n✅ Analysis complete! Output saved to: ${outputPath}`);
