export const GROCERY_SECTIONS = [
  { id: 'nonDairyProtein', label: 'Non-Dairy Protein', icon: '🥩', categories: ['protein'] },
  { id: 'dairyProtein', label: 'Dairy Protein', icon: '🥛', categories: ['dairy'] },
  { id: 'grains', label: 'Grains', icon: '🌾', categories: ['grain'] },
  { id: 'starches', label: 'Starches', icon: '🥔', categories: ['starch'] },
  { id: 'veggies', label: 'Veggies', icon: '🥬', categories: ['vegetable'] },
  { id: 'fruit', label: 'Fruit', icon: '🍎', categories: ['fruit'] },
  { id: 'extraFats', label: 'Extra Fats', icon: '🥑', categories: ['fat'] },
];

const LOG_SECTION_MAP = {
  Protein: 'nonDairyProtein',
  'Grains / Starches': 'grains',
  Vegetables: 'veggies',
  Fruits: 'fruit',
  Fats: 'extraFats',
};

export function grocerySectionForFood(food) {
  if (!food) return 'nonDairyProtein';
  const cat = food.category;
  if (cat === 'protein') return 'nonDairyProtein';
  if (cat === 'dairy') return 'dairyProtein';
  if (cat === 'grain') return 'grains';
  if (cat === 'starch') return 'starches';
  if (cat === 'vegetable') return 'veggies';
  if (cat === 'fruit') return 'fruit';
  if (cat === 'fat') return 'extraFats';
  return 'nonDairyProtein';
}

function sectionForLog(category, food) {
  if (food) return grocerySectionForFood(food);
  return LOG_SECTION_MAP[category] || 'nonDairyProtein';
}

function parseLeadingNumber(label) {
  const m = String(label).match(/^([\d.]+)/);
  return m ? Number(m[1]) : 0;
}

export function groceryDisplayName(foodName) {
  return foodName === 'Egg whites' ? 'Eggs' : foodName;
}

export function formatGroceryQuantity(item) {
  if (item.isCountBased) {
    const count = Math.ceil(item.weeklyUnits);
    const isEggs = item.foodName === 'Egg whites';
    if (count >= 12) {
      const dozens = Math.floor(count / 12);
      const remainder = count % 12;
      if (remainder === 0) {
        return isEggs
          ? `${dozens === 1 ? '1 dozen' : `${dozens} dozen`} eggs`
          : `${dozens} doz`;
      }
      return isEggs
        ? `${dozens === 1 ? '1 dozen' : `${dozens} dozen`} + ${remainder} eggs`
        : `${dozens} doz ${remainder}`;
    }
    return isEggs ? `${count} eggs` : String(count);
  }

  const totalOz = item.weeklyGrams / 28.3495;
  if (totalOz >= 16) {
    const lbs = Math.floor(totalOz / 16);
    const remainingOz = Math.round(totalOz % 16);
    if (remainingOz === 0) {
      return `${lbs} lb (${Math.round(item.weeklyGrams)} g)`;
    }
    return `${lbs} lb ${remainingOz} oz (${Math.round(item.weeklyGrams)} g)`;
  }
  return `${totalOz.toFixed(1)} oz (${Math.round(item.weeklyGrams)} g)`;
}

export function groceryDateRangeLabel() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `Based on ${fmt(start)} – ${fmt(end)}`;
}

export function entriesLast7Days(entries) {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - 7);
  return entries.filter((e) => {
    const d = new Date(`${e.date}T12:00:00`);
    return d >= cutoff;
  });
}

export function buildGroceryFromEntries(entries, foods) {
  if (!entries.length) return [];

  const foodLookup = Object.fromEntries(foods.map((f) => [f.name, f]));
  const totalGrams = {};
  const totalUnits = {};
  const categoryMap = {};

  for (const entry of entries) {
    categoryMap[entry.foodName] = entry.category;
    const food = foodLookup[entry.foodName];

    if (food?.unitsPerServing > 0) {
      const count = parseLeadingNumber(entry.servingLabel);
      totalUnits[entry.foodName] = (totalUnits[entry.foodName] || 0) + count;
      totalGrams[entry.foodName] = (totalGrams[entry.foodName] || 0) + food.gramWeight * (count / food.unitsPerServing);
    } else {
      const grams = parseLeadingNumber(entry.servingLabel);
      totalGrams[entry.foodName] = (totalGrams[entry.foodName] || 0) + grams;
    }
  }

  const items = [];
  for (const [foodName, grams] of Object.entries(totalGrams)) {
    const food = foodLookup[foodName];
    const isCountBased = (food?.unitsPerServing || 0) > 0;
    items.push({
      id: `log:${foodName}`,
      foodName,
      weeklyGrams: grams,
      weeklyUnits: totalUnits[foodName] || 0,
      unitLabel: food?.servingDescription || '',
      isCountBased,
      storeSection: sectionForLog(categoryMap[foodName], food),
      manual: false,
    });
  }

  return items.sort((a, b) => b.weeklyGrams - a.weeklyGrams);
}

export function createManualGroceryItem(food) {
  const defaultServings = 7;
  const isCountBased = food.unitsPerServing > 0;
  return {
    id: `manual:${food.name}:${Date.now()}`,
    foodName: food.name,
    weeklyGrams: food.gramWeight * defaultServings,
    weeklyUnits: isCountBased ? food.unitsPerServing * defaultServings : 0,
    unitLabel: food.servingDescription,
    isCountBased,
    storeSection: grocerySectionForFood(food),
    manual: true,
  };
}

export function groupGroceryItems(items) {
  return GROCERY_SECTIONS.map((section) => ({
    section,
    items: items.filter((i) => i.storeSection === section.id),
  })).filter((g) => g.items.length > 0);
}
