import { computePlan, generateMealSlots } from './burnEngine.js';
import { getCoachDay, getProgramDay } from './coachEngine.js';
import {
  buildGroceryFromEntries,
  createManualGroceryItem,
  entriesLast7Days,
  formatGroceryQuantity,
  groceryDateRangeLabel,
  groceryDisplayName,
  groupGroceryItems,
} from './groceryEngine.js';

const store = {
  profile: null,
  entries: [],
  foods: [],
  pickCounts: {},
  screen: 'loading',
  expandedMeal: null,
  expandedSections: {},
  sectionTabs: {},
  foodSearch: {},
  coachCardIndex: 0,
  coachProgress: { day1Complete: false },
  groceryItems: [],
  groceryChecked: {},
  groceryRemoved: {},
  groceryExtras: [],
  showGroceryAdd: false,
  groceryAddTab: 'protein',
  groceryAddSearch: '',
};

const INTENSITY_OPTS = [
  { v: 1.0, label: '1.0 Sedentary' },
  { v: 1.5, label: '1.5 Light' },
  { v: 2.0, label: '2.0 Moderate' },
  { v: 2.5, label: '2.5 Active' },
  { v: 3.0, label: '3.0 Heavy' },
  { v: 3.5, label: '3.5 Very Heavy' },
  { v: 4.0, label: '4.0 Extreme' },
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function sectionKey(slotLabel, sectionId) {
  return `${slotLabel}|${sectionId}`;
}

function load() {
  try {
    const p = localStorage.getItem('hardkor_profile');
    if (p) store.profile = JSON.parse(p);
    const e = localStorage.getItem('hardkor_entries');
    if (e) store.entries = JSON.parse(e);
    const c = localStorage.getItem('hardkor_pick_counts');
    if (c) store.pickCounts = JSON.parse(c);
    const cp = localStorage.getItem('hardkor_coach_progress');
    if (cp) store.coachProgress = JSON.parse(cp);
  } catch (err) {
    console.error(err);
  }
}

function saveProfile() {
  localStorage.setItem('hardkor_profile', JSON.stringify(store.profile));
}

function saveEntries() {
  localStorage.setItem('hardkor_entries', JSON.stringify(store.entries));
}

function savePickCounts() {
  localStorage.setItem('hardkor_pick_counts', JSON.stringify(store.pickCounts));
}

function saveCoachProgress() {
  localStorage.setItem('hardkor_coach_progress', JSON.stringify(store.coachProgress));
}

function showCoachBanner() {
  const day = getCoachDay(getProgramDay());
  return day && !store.coachProgress.day1Complete;
}

function markCoachDayComplete(dayNumber) {
  if (dayNumber === 1 && !store.coachProgress.day1Complete) {
    store.coachProgress.day1Complete = true;
    saveCoachProgress();
  }
}

function refreshGroceryList() {
  const fromLogs = buildGroceryFromEntries(entriesLast7Days(store.entries), store.foods);
  const logNames = new Set(fromLogs.map((i) => i.foodName));
  const extras = store.groceryExtras.filter((e) => !logNames.has(e.foodName));
  store.groceryItems = [...fromLogs, ...extras]
    .filter((i) => !store.groceryRemoved[i.id])
    .map((i) => ({ ...i, isChecked: !!store.groceryChecked[i.id] }));
}

function toggleGroceryCheck(id) {
  store.groceryChecked[id] = !store.groceryChecked[id];
  const item = store.groceryItems.find((i) => i.id === id);
  if (item) item.isChecked = store.groceryChecked[id];
  render();
}

function removeGroceryItem(id) {
  store.groceryRemoved[id] = true;
  store.groceryItems = store.groceryItems.filter((i) => i.id !== id);
  render();
}

function addGroceryFood(foodName) {
  const food = store.foods.find((f) => f.name === foodName);
  if (!food) return;
  const names = new Set(store.groceryItems.map((i) => i.foodName));
  if (names.has(food.name)) return;
  const item = { ...createManualGroceryItem(food), isChecked: false };
  store.groceryExtras.push(item);
  store.groceryItems.push(item);
  render();
}

function uncheckAllGrocery() {
  store.groceryChecked = {};
  store.groceryItems.forEach((i) => { i.isChecked = false; });
  render();
}

function bumpPickCount(foodName) {
  store.pickCounts[foodName] = (store.pickCounts[foodName] || 0) + 1;
  savePickCounts();
}

function fmtServings(n) {
  if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 0.05) return String(Math.round(n));
  return n.toFixed(1);
}

function scaledLabel(food, servings) {
  if (food.unitsPerServing > 0) {
    const count = Math.ceil(food.unitsPerServing * servings);
    return `${count} ${food.servingDescription}`;
  }
  return `${Math.round(food.gramWeight * servings)} g`;
}

function foodsForCategories(cats) {
  return store.foods.filter((f) => cats.includes(f.category));
}

function topPicks(foods, limit = 5) {
  return foods
    .filter((f) => (store.pickCounts[f.name] || 0) > 0)
    .sort((a, b) => (store.pickCounts[b.name] || 0) - (store.pickCounts[a.name] || 0))
    .slice(0, limit);
}

function todayEntries() {
  const key = todayKey();
  return store.entries.filter((e) => e.date === key);
}

function getPlan() {
  if (!store.profile?.leanBodyMass) return null;
  const p = store.profile;
  return computePlan({
    lbm: p.leanBodyMass,
    intensity: p.workIntensity,
    weightTrainingHours: p.weightTrainingHours,
    cardioHours: p.cardioHours,
    fatBurningHours: p.fatBurningHours,
  });
}

function fatPointsConsumed() {
  return todayEntries()
    .filter((e) => e.category === 'Fats')
    .reduce((s, e) => s + (e.fatPoints || 1), 0);
}

function logFood(slotLabel, category, food, servings, { collapseSection } = {}) {
  const key = todayKey();
  if (category !== 'Fats') {
    store.entries = store.entries.filter(
      (e) => !(e.date === key && e.mealSlotLabel === slotLabel && e.category === category)
    );
  }
  store.entries.unshift({
    id: crypto.randomUUID(),
    date: key,
    mealSlotLabel: slotLabel,
    category,
    foodName: food.name,
    servingLabel: category === 'Fats' ? food.servingDescription : scaledLabel(food, servings),
    fatPoints: category === 'Fats' ? 1 : 0,
    loggedAt: Date.now(),
  });
  bumpPickCount(food.name);
  saveEntries();
  if (collapseSection) {
    store.expandedSections[collapseSection] = false;
  }
  render();
}

function removeEntry(id) {
  store.entries = store.entries.filter((e) => e.id !== id);
  saveEntries();
  render();
}

function removeCategoryEntry(slotLabel, category) {
  const key = todayKey();
  store.entries = store.entries.filter(
    (e) => !(e.date === key && e.mealSlotLabel === slotLabel && e.category === category)
  );
  saveEntries();
  render();
}

function removeOneFat(slotLabel, foodName) {
  const key = todayKey();
  const idx = store.entries.findIndex(
    (e) => e.date === key && e.mealSlotLabel === slotLabel && e.category === 'Fats' && e.foodName === foodName
  );
  if (idx >= 0) {
    store.entries.splice(idx, 1);
    saveEntries();
    render();
  }
}

function entryFor(slotLabel, category) {
  return todayEntries().find((e) => e.mealSlotLabel === slotLabel && e.category === category);
}

function entriesFor(slotLabel, category) {
  return todayEntries().filter((e) => e.mealSlotLabel === slotLabel && e.category === category);
}

function isSectionOpen(slotLabel, sectionId) {
  return !!store.expandedSections[sectionKey(slotLabel, sectionId)];
}

function filterFoods(foods, searchKey) {
  const q = (store.foodSearch[searchKey] || '').trim().toLowerCase();
  if (!q) return foods;
  return foods.filter((f) => f.name.toLowerCase().includes(q));
}

function renderFoodRows(slotLabel, category, servings, foods, loggedName, sk) {
  const picks = topPicks(foods);
  const pickNames = new Set(picks.map((f) => f.name));
  const rest = foods.filter((f) => !pickNames.has(f.name));
  const filteredPicks = filterFoods(picks, sk);
  const filteredRest = filterFoods(rest, sk);

  const row = (food) => {
    const logged = food.name === loggedName;
    const label = category === 'Fats' ? food.servingDescription : scaledLabel(food, servings || 1);
    return `
      <button type="button" class="food-row ${logged ? 'logged' : ''}"
        data-log-slot="${slotLabel}" data-log-category="${category}" data-log-servings="${servings || 1}"
        data-log-food="${encodeURIComponent(food.name)}" data-collapse="${sk}">
        <span class="food-row-plus">${logged ? '✓' : '+'}</span>
        <span class="food-row-name">${food.name}</span>
        <span class="food-row-label">${label}</span>
      </button>`;
  };

  let html = '';
  if (filteredPicks.length) {
    html += `<div class="top-picks-label">★ Your Top Picks</div>`;
    html += filteredPicks.map(row).join('');
    if (filteredRest.length) html += `<div class="food-divider"></div>`;
  }
  html += filteredRest.map(row).join('');
  if (!filteredPicks.length && !filteredRest.length) {
    html += `<div class="food-empty">No foods match your search</div>`;
  }
  return html;
}

function renderCategorySection(slotLabel, sectionId, title, category, servings, foodCats) {
  const sk = sectionKey(slotLabel, sectionId);
  const open = isSectionOpen(slotLabel, sectionId);
  const logged = entryFor(slotLabel, category);
  const foods = foodsForCategories(foodCats).sort((a, b) => a.name.localeCompare(b.name));

  return `
    <div class="cat-section ${logged ? 'has-logged' : ''}">
      <button type="button" class="cat-header" data-toggle-section="${sk}">
        <div class="cat-header-main">
          <span class="cat-header-title">${title}</span>
          <span class="cat-header-servings">${fmtServings(servings)} servings</span>
          <span class="cat-chevron">${open ? '▲' : '▼'}</span>
        </div>
        ${logged ? `<div class="cat-header-logged">${logged.foodName} · ${logged.servingLabel}</div>` : ''}
      </button>
      ${open ? `
      <div class="cat-body">
        ${logged ? `
          <button type="button" class="none-btn" data-clear-slot="${slotLabel}" data-clear-category="${category}" data-collapse="${sk}">None — clear selection</button>
          <div class="food-divider"></div>` : ''}
        <input type="search" class="food-search" placeholder="Search foods…" data-search="${sk}" value="${store.foodSearch[sk] || ''}" />
        <div class="food-hint">Tap a food to log it</div>
        <div class="food-list">${renderFoodRows(slotLabel, category, servings, foods, logged?.foodName, sk)}</div>
      </div>` : ''}
    </div>`;
}

function renderProteinSection(slotLabel, servings) {
  const sectionId = 'Protein';
  const sk = sectionKey(slotLabel, sectionId);
  const open = isSectionOpen(slotLabel, sectionId);
  const tab = store.sectionTabs[sk] || 'protein';
  const logged = entryFor(slotLabel, 'Protein');
  const proteins = foodsForCategories(['protein']).sort((a, b) => a.name.localeCompare(b.name));
  const dairy = foodsForCategories(['dairy']).sort((a, b) => a.name.localeCompare(b.name));
  const activeFoods = tab === 'protein' ? proteins : dairy;

  return `
    <div class="cat-section ${logged ? 'has-logged' : ''}">
      <button type="button" class="cat-header" data-toggle-section="${sk}">
        <div class="cat-header-main">
          <span class="cat-header-title">Protein</span>
          <span class="cat-header-servings">${fmtServings(servings)} servings</span>
          <span class="cat-chevron">${open ? '▲' : '▼'}</span>
        </div>
        ${logged ? `<div class="cat-header-logged">${logged.foodName} · ${logged.servingLabel}</div>` : ''}
      </button>
      ${open ? `
      <div class="cat-body">
        ${logged ? `
          <button type="button" class="none-btn" data-clear-slot="${slotLabel}" data-clear-category="Protein" data-collapse="${sk}">None — clear selection</button>
          <div class="food-divider"></div>` : ''}
        <div class="cat-tabs">
          <button type="button" class="${tab === 'protein' ? 'active' : ''}" data-tab-key="${sk}" data-tab-val="protein">Protein</button>
          <button type="button" class="${tab === 'dairy' ? 'active' : ''}" data-tab-key="${sk}" data-tab-val="dairy">Dairy</button>
        </div>
        <input type="search" class="food-search" placeholder="Search ${tab === 'protein' ? 'proteins' : 'dairy'}…" data-search="${sk}" value="${store.foodSearch[sk] || ''}" />
        <div class="food-hint">Tap a food to log it</div>
        <div class="food-list">${renderFoodRows(slotLabel, 'Protein', servings, activeFoods, logged?.foodName, sk)}</div>
      </div>` : ''}
    </div>`;
}

function renderGrainSection(slotLabel, servings) {
  const sectionId = 'Grains';
  const sk = sectionKey(slotLabel, sectionId);
  const open = isSectionOpen(slotLabel, sectionId);
  const tab = store.sectionTabs[sk] || 'starch';
  const logged = entryFor(slotLabel, 'Grains / Starches');
  const starches = foodsForCategories(['starch']).sort((a, b) => a.name.localeCompare(b.name));
  const grains = foodsForCategories(['grain']).sort((a, b) => a.name.localeCompare(b.name));
  const activeFoods = tab === 'starch' ? starches : grains;

  return `
    <div class="cat-section ${logged ? 'has-logged' : ''}">
      <button type="button" class="cat-header" data-toggle-section="${sk}">
        <div class="cat-header-main">
          <span class="cat-header-title">Grains / Starches</span>
          <span class="cat-header-servings">${fmtServings(servings)} servings</span>
          <span class="cat-chevron">${open ? '▲' : '▼'}</span>
        </div>
        ${logged ? `<div class="cat-header-logged">${logged.foodName} · ${logged.servingLabel}</div>` : ''}
      </button>
      ${open ? `
      <div class="cat-body">
        ${logged ? `
          <button type="button" class="none-btn" data-clear-slot="${slotLabel}" data-clear-category="Grains / Starches" data-collapse="${sk}">None — clear selection</button>
          <div class="food-divider"></div>` : ''}
        <div class="cat-tabs">
          <button type="button" class="${tab === 'starch' ? 'active' : ''}" data-tab-key="${sk}" data-tab-val="starch">Starches</button>
          <button type="button" class="${tab === 'grain' ? 'active' : ''}" data-tab-key="${sk}" data-tab-val="grain">Grains</button>
        </div>
        <input type="search" class="food-search" placeholder="Search ${tab === 'starch' ? 'starches' : 'grains'}…" data-search="${sk}" value="${store.foodSearch[sk] || ''}" />
        <div class="food-hint">Tap a food to log it</div>
        <div class="food-list">${renderFoodRows(slotLabel, 'Grains / Starches', servings, activeFoods, logged?.foodName, sk)}</div>
      </div>` : ''}
    </div>`;
}

function groupedFatEntries(slotLabel) {
  const entries = entriesFor(slotLabel, 'Fats');
  const map = {};
  for (const e of entries) {
    if (map[e.foodName]) map[e.foodName].count += 1;
    else map[e.foodName] = { serving: e.servingLabel, count: 1 };
  }
  return Object.entries(map)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function renderExtraFatsSection(slotLabel) {
  const sectionId = 'Fats';
  const sk = sectionKey(slotLabel, sectionId);
  const open = isSectionOpen(slotLabel, sectionId);
  const grouped = groupedFatEntries(slotLabel);
  const totalPts = grouped.reduce((s, g) => s + g.count, 0);
  const foods = foodsForCategories(['fat']).sort((a, b) => a.name.localeCompare(b.name));

  return `
    <div class="cat-section fats-section ${grouped.length ? 'has-logged' : ''}">
      <button type="button" class="cat-header" data-toggle-section="${sk}">
        <div class="cat-header-main">
          <span class="cat-header-title">Extra fats</span>
          ${totalPts ? `<span class="fat-pts-badge">${totalPts.toFixed(1)} pts</span>` : ''}
          <span class="cat-chevron">${open ? '▲' : '▼'}</span>
        </div>
        ${grouped.length
          ? grouped.map((g) => `<div class="cat-header-logged">${g.name} · ${g.serving}${g.count > 1 ? ` ×${g.count}` : ''}</div>`).join('')
          : `<div class="cat-header-hint">slows your fat loss</div>`}
      </button>
      ${open ? `
      <div class="cat-body">
        ${grouped.map((g) => `
          <button type="button" class="remove-fat-btn" data-remove-fat-slot="${slotLabel}" data-remove-fat-name="${encodeURIComponent(g.name)}">
            − Remove one ${g.name}${g.count > 1 ? ` (×${g.count})` : ''}
          </button>`).join('')}
        ${grouped.length ? `<div class="food-divider"></div>` : ''}
        <input type="search" class="food-search" placeholder="Search fats…" data-search="${sk}" value="${store.foodSearch[sk] || ''}" />
        <div class="food-hint">Tap to add a fat point</div>
        <div class="food-list">${renderFatRows(slotLabel, foods, grouped, sk)}</div>
      </div>` : ''}
    </div>`;
}

function renderFatRows(slotLabel, foods, grouped, sk) {
  const counts = Object.fromEntries(grouped.map((g) => [g.name, g.count]));
  const picks = topPicks(foods);
  const pickNames = new Set(picks.map((f) => f.name));
  const rest = foods.filter((f) => !pickNames.has(f.name));
  const filteredPicks = filterFoods(picks, sk);
  const filteredRest = filterFoods(rest, sk);

  const row = (food) => {
    const count = counts[food.name] || 0;
    return `
      <button type="button" class="food-row ${count ? 'logged' : ''}"
        data-log-slot="${slotLabel}" data-log-category="Fats" data-log-servings="1"
        data-log-food="${encodeURIComponent(food.name)}">
        <span class="food-row-plus">${count ? `×${count}` : '+'}</span>
        <span class="food-row-name">${food.name}</span>
        <span class="food-row-label">${food.servingDescription}</span>
      </button>`;
  };

  let html = '';
  if (filteredPicks.length) {
    html += `<div class="top-picks-label">★ Your Top Picks</div>`;
    html += filteredPicks.map(row).join('');
    if (filteredRest.length) html += `<div class="food-divider"></div>`;
  }
  html += filteredRest.map(row).join('');
  if (!filteredPicks.length && !filteredRest.length) {
    html += `<div class="food-empty">No foods match your search</div>`;
  }
  return html;
}

function mealProgress(slot) {
  const required = [];
  if (slot.proteinServings > 0) required.push('Protein');
  if (slot.grainStarchServings > 0) required.push('Grains / Starches');
  if (slot.vegetableServings > 0) required.push('Vegetables');
  if (slot.fruitServings > 0) required.push('Fruits');
  const logged = required.filter((cat) => entryFor(slot.label, cat));
  return { required: required.length, logged: logged.length };
}

function renderOnboarding() {
  const p = store.profile || {};
  return `
    <div class="screen">
      <div class="onboard-title">
        <h1>Your Custom Plan</h1>
        <p>Answer a few questions. The HARDKOR engine calculates your exact daily servings.</p>
      </div>
      <form class="form-block" id="setupForm">
        <label>First name</label>
        <input name="preferredName" value="${p.preferredName || ''}" required />

        <label>Sex</label>
        <div class="seg-row" data-seg="sex">
          <button type="button" class="${(p.sex || 'Male') === 'Male' ? 'active' : ''}" data-val="Male">Male</button>
          <button type="button" class="${p.sex === 'Female' ? 'active' : ''}" data-val="Female">Female</button>
        </div>
        <input type="hidden" name="sex" value="${p.sex || 'Male'}" />

        <label>Age</label>
        <input name="age" type="number" min="16" max="99" value="${p.age || 40}" required />

        <label>Height (inches)</label>
        <input name="heightInches" type="number" step="0.5" value="${p.heightInches || 70}" required />

        <label>Bodyweight (lbs)</label>
        <input name="totalWeight" type="number" step="0.1" value="${p.totalWeight || ''}" required />

        <label>Body fat %</label>
        <input name="fatPercent" type="number" step="0.1" value="${p.fatPercent || ''}" required />

        <label>Work intensity</label>
        <select name="workIntensity">
          ${INTENSITY_OPTS.map((o) => `<option value="${o.v}" ${p.workIntensity === o.v ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>

        <label>Weight training (hrs/week)</label>
        <input name="weightTrainingHours" type="number" step="0.5" min="0" value="${p.weightTrainingHours ?? 3}" />

        <label>Cardio — high heart rate (hrs/week)</label>
        <input name="cardioHours" type="number" step="0.5" min="0" value="${p.cardioHours ?? 2}" />

        <label>Fat burning — low heart rate (hrs/week)</label>
        <input name="fatBurningHours" type="number" step="0.5" min="0" value="${p.fatBurningHours ?? 3}" />

        <label>Wake time</label>
        <input name="wakeTime" type="time" value="${p.wakeTime || '08:00'}" />

        <div style="height:24px"></div>
        <button type="submit" class="btn-primary">Calculate My Plan</button>
      </form>
    </div>`;
}

function renderHome() {
  const name = store.profile?.preferredName || '';
  return `
    <div class="screen">
      <div class="logo-block">
        <div class="brand">HARDKOR</div>
        <div class="tagline">Your effort defines you</div>
      </div>
      <div class="btn-stack">
        <button type="button" class="btn-primary" data-nav="plan">Your Custom Food Plan</button>
        <button type="button" class="btn-primary" data-nav="grocery">Grocery List</button>
        <button type="button" class="btn-primary" data-nav="coach">Coaching</button>
        <button type="button" class="btn-secondary" data-nav="setup">Edit Your Custom Food Plan</button>
      </div>
      <p class="home-footer">Stay consistent. Eat on time.${name ? ` — ${name}` : ''}</p>
    </div>`;
}

function renderPlan() {
  const plan = getPlan();
  if (!plan) return renderOnboarding();

  const [wh, wm] = (store.profile.wakeTime || '08:00').split(':').map(Number);
  const slots = generateMealSlots(wh, wm, plan.servings);
  const fatTarget = plan.servings.fatMaintain;
  const fatUsed = fatPointsConsumed();
  const fatPct = fatTarget ? Math.min(fatUsed / fatTarget, 1) : 0;

  return `
    <div class="screen">
      <div class="plan-header">
        <button type="button" class="back-btn" data-nav="home">← Home</button>
        <h1>Custom Food Plan</h1>
      </div>

      ${showCoachBanner() ? `
      <button type="button" class="coach-banner" data-nav="coach">
        <span class="coach-banner-icon">🔥</span>
        <span class="coach-banner-text">New message from Coach Kory</span>
        <span class="coach-banner-chevron">›</span>
      </button>` : ''}

      <div class="summary-card">
        <h2>Daily targets</h2>
        <div class="summary-grid">
          <span>Protein servings</span><span>${plan.servings.protein}</span>
          <span>Grains & starches</span><span>${plan.servings.grainsStarches}</span>
          <span>Fruit servings</span><span>${plan.servings.fruits}</span>
          <span>Vegetable servings</span><span>${plan.servings.vegetables}</span>
          <span>Maintain calories</span><span>${Math.round(plan.maintainTotalCals)}</span>
          <span>Reduce calories</span><span>${Math.round(plan.reduceTotalCals)}</span>
        </div>
      </div>

      <div class="fat-bar-wrap">
        <div class="fat-bar"><div class="fat-bar-fill ${fatUsed >= fatTarget ? 'over' : ''}" style="width:${fatPct * 100}%"></div></div>
        <div class="fat-bar-meta">
          <span>Fat points</span>
          <span>${fatUsed.toFixed(1)} / ${fatTarget} pts</span>
        </div>
      </div>

      ${slots.map((slot) => {
        const expanded = store.expandedMeal === slot.label;
        const progress = mealProgress(slot);
        const complete = progress.required > 0 && progress.logged === progress.required;
        const logged = todayEntries()
          .filter((e) => e.mealSlotLabel === slot.label)
          .map((e) => `${e.foodName} ${e.servingLabel}`);
        return `
        <div class="meal-card ${complete ? 'meal-complete' : ''}">
          <button type="button" class="meal-card-header" data-toggle="${slot.label}">
            <div>
              <div class="label-row">
                <span class="label">${slot.label}</span>
                ${complete ? '<span class="meal-check">✓</span>' : ''}
              </div>
              ${!expanded && logged.length ? logged.map((l) => `<div class="logged">${l}</div>`).join('') : ''}
              ${!expanded && progress.required ? `<div class="meal-progress">${progress.logged}/${progress.required} logged</div>` : ''}
            </div>
            <div class="meta">
              <div>${slot.time}</div>
              <div class="expand">${expanded ? 'Close' : 'Expand'}</div>
            </div>
          </button>
          ${expanded ? `
          <div class="meal-body">
            ${slot.proteinServings > 0 ? renderProteinSection(slot.label, slot.proteinServings) : ''}
            ${slot.grainStarchServings > 0 ? renderGrainSection(slot.label, slot.grainStarchServings) : ''}
            ${slot.vegetableServings > 0 ? renderCategorySection(slot.label, 'Vegetables', 'Vegetables', 'Vegetables', slot.vegetableServings, ['vegetable']) : ''}
            ${slot.fruitServings > 0 ? renderCategorySection(slot.label, 'Fruits', 'Fruits', 'Fruits', slot.fruitServings, ['fruit']) : ''}
            ${renderExtraFatsSection(slot.label)}
          </div>` : ''}
        </div>`;
      }).join('')}
      <div style="height:32px"></div>
    </div>`;
}

function formatCoachParagraphs(text) {
  return text
    .split('\n\n')
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function renderCoach() {
  const day = getCoachDay(getProgramDay());
  if (!day) {
    return `
      <div class="screen coach-screen">
        <div class="plan-header">
          <button type="button" class="back-btn" data-nav="home">← Home</button>
          <h1>Coach Kory</h1>
        </div>
        <div class="coach-empty">
          <div class="coach-empty-icon">🔥</div>
          <p>New content coming soon.</p>
        </div>
      </div>`;
  }

  const idx = store.coachCardIndex;
  return `
    <div class="screen coach-screen">
      <div class="plan-header">
        <button type="button" class="back-btn" data-nav="home">← Home</button>
        <h1>Coach Kory</h1>
        <span class="coach-counter">${idx + 1} / ${day.cards.length}</span>
      </div>

      <div class="coach-carousel" id="coachCarousel">
        ${day.cards.map((card, i) => `
          <div class="coach-slide" data-slide="${i}">
            <div class="coach-text-card">
              <h2>${card.title}</h2>
              <div class="coach-body">${formatCoachParagraphs(card.text)}</div>
            </div>
            <img class="coach-screenshot" src="${card.image}" alt="Coach Kory day ${day.dayNumber} — card ${i + 1}" loading="lazy" />
          </div>`).join('')}
      </div>

      <div class="coach-footer">
        <div class="coach-dots">
          ${day.cards.map((_, i) => `<span class="coach-dot ${i === idx ? 'active' : ''}" data-coach-dot="${i}"></span>`).join('')}
        </div>
        <p class="coach-swipe-hint">Swipe for next card</p>
      </div>
    </div>`;
}

function renderGroceryAddSheet() {
  if (!store.showGroceryAdd) return '';

  const tabCats = {
    protein: ['protein'],
    dairy: ['dairy'],
    grains: ['grain'],
    starches: ['starch'],
    vegetables: ['vegetable'],
    fruits: ['fruit'],
    fats: ['fat'],
  };
  const tabLabels = {
    protein: 'Protein', dairy: 'Dairy', grains: 'Grains', starches: 'Starches',
    vegetables: 'Vegetables', fruits: 'Fruits', fats: 'Fats',
  };
  const cats = tabCats[store.groceryAddTab] || ['protein'];
  const onList = new Set(store.groceryItems.map((i) => i.foodName));
  let foods = store.foods.filter((f) => cats.includes(f.category)).sort((a, b) => a.name.localeCompare(b.name));
  const q = store.groceryAddSearch.trim().toLowerCase();
  if (q) foods = foods.filter((f) => f.name.toLowerCase().includes(q));
  const picks = foods.filter((f) => (store.pickCounts[f.name] || 0) > 0)
    .sort((a, b) => (store.pickCounts[b.name] || 0) - (store.pickCounts[a.name] || 0));
  const pickNames = new Set(picks.map((f) => f.name));
  const rest = foods.filter((f) => !pickNames.has(f.name));

  const row = (food) => {
    const on = onList.has(food.name);
    return `
      <button type="button" class="grocery-add-row ${on ? 'on-list' : ''}" data-grocery-add-food="${encodeURIComponent(food.name)}" ${on ? 'disabled' : ''}>
        <span class="grocery-add-check">${on ? '✓' : '○'}</span>
        <span class="grocery-add-name">${food.name}</span>
        ${on ? '<span class="grocery-add-tag">On list</span>' : `<span class="grocery-add-serving">${food.servingDescription}</span>`}
      </button>`;
  };

  return `
    <div class="sheet-backdrop" data-close-grocery-add>
      <div class="sheet-panel" role="dialog">
        <div class="sheet-header">
          <button type="button" class="back-btn" data-close-grocery-add>Close</button>
          <h2>Select Additional Foods</h2>
        </div>
        <div class="grocery-add-tabs">
          ${Object.keys(tabCats).map((tab) => `
            <button type="button" class="${store.groceryAddTab === tab ? 'active' : ''}" data-grocery-add-tab="${tab}">${tabLabels[tab]}</button>
          `).join('')}
        </div>
        <input type="search" class="food-search" placeholder="Search foods…" data-grocery-add-search value="${store.groceryAddSearch}" />
        <div class="grocery-add-list">
          ${picks.length ? `<div class="top-picks-label">★ Your Top Picks</div>${picks.map(row).join('')}${rest.length ? '<div class="food-divider"></div>' : ''}` : ''}
          ${rest.length ? `<div class="food-hint">All ${tabLabels[store.groceryAddTab]}</div>${rest.map(row).join('')}` : ''}
          ${!foods.length ? '<div class="food-empty">No foods match your search</div>' : ''}
        </div>
      </div>
    </div>`;
}

function renderGrocery() {
  const groups = groupGroceryItems(store.groceryItems);
  const checkedCount = store.groceryItems.filter((i) => i.isChecked).length;

  return `
    <div class="screen grocery-screen">
      <div class="plan-header">
        <button type="button" class="back-btn" data-nav="home">← Home</button>
        <h1>Grocery List</h1>
      </div>

      <div class="grocery-header">
        <div class="grocery-header-title">last 7 days food choices</div>
        <div class="grocery-header-range">${groceryDateRangeLabel()}</div>
        ${store.groceryItems.length ? `<div class="grocery-header-count">${store.groceryItems.length} items</div>` : ''}
      </div>

      <button type="button" class="grocery-add-btn" data-open-grocery-add>
        <span>+</span> Select Additional Foods
      </button>

      ${!store.groceryItems.length ? `
      <div class="grocery-empty">
        <h2>No items yet</h2>
        <p>Start logging meals in your Custom Food Plan. Your grocery list builds from what you actually eat.</p>
      </div>` : ''}

      ${groups.map(({ section, items }) => `
        <div class="grocery-section">
          <div class="grocery-section-header">
            <span class="grocery-section-icon">${section.icon}</span>
            <span class="grocery-section-label">${section.label}</span>
            <span class="grocery-section-count">${items.length}</span>
          </div>
          ${items.map((item) => `
            <div class="grocery-row ${item.isChecked ? 'checked' : ''}">
              <button type="button" class="grocery-check" data-grocery-check="${item.id}" aria-label="Check off ${item.foodName}">
                ${item.isChecked ? '✓' : '○'}
              </button>
              <div class="grocery-row-body">
                <div class="grocery-row-name">${groceryDisplayName(item.foodName)}</div>
                <div class="grocery-row-qty">${formatGroceryQuantity(item)}</div>
              </div>
              <button type="button" class="grocery-remove" data-grocery-remove="${item.id}" aria-label="Remove ${item.foodName}">×</button>
            </div>`).join('')}
        </div>`).join('')}

      ${checkedCount > 0 ? `
        <button type="button" class="grocery-uncheck-all" data-grocery-uncheck-all>Uncheck All</button>` : ''}

      <div style="height:32px"></div>
      ${renderGroceryAddSheet()}
    </div>`;
}

function render() {
  const root = document.getElementById('app');
  if (store.screen === 'loading') {
    root.innerHTML = '<div class="screen"><div class="logo-block"><div class="brand">HARDKOR</div></div></div>';
    return;
  }
  if (store.screen === 'setup') root.innerHTML = renderOnboarding();
  else if (store.screen === 'plan') root.innerHTML = renderPlan();
  else if (store.screen === 'coach') root.innerHTML = renderCoach();
  else if (store.screen === 'grocery') root.innerHTML = renderGrocery();
  else root.innerHTML = renderHome();
  bindEvents();
}

function updateCoachDots(idx, total) {
  document.querySelectorAll('.coach-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === idx);
  });
  const counter = document.querySelector('.coach-counter');
  if (counter) counter.textContent = `${idx + 1} / ${total}`;
}

let coachScrollHandler = null;

function bindCoachCarousel() {
  const carousel = document.getElementById('coachCarousel');
  if (!carousel) return;

  const day = getCoachDay(getProgramDay());
  if (!day) return;

  const total = day.cards.length;

  if (coachScrollHandler) {
    carousel.removeEventListener('scroll', coachScrollHandler);
  }

  coachScrollHandler = () => {
    const width = carousel.clientWidth || 1;
    const next = Math.min(Math.round(carousel.scrollLeft / width), total - 1);
    if (next !== store.coachCardIndex) {
      store.coachCardIndex = next;
      updateCoachDots(next, total);
      if (next === total - 1) markCoachDayComplete(day.dayNumber);
    }
  };

  carousel.addEventListener('scroll', coachScrollHandler, { passive: true });

  requestAnimationFrame(() => {
    carousel.scrollLeft = store.coachCardIndex * carousel.clientWidth;
  });

  document.querySelectorAll('[data-coach-dot]').forEach((dot) => {
    dot.addEventListener('click', () => {
      const i = Number(dot.dataset.coachDot);
      store.coachCardIndex = i;
      carousel.scrollTo({ left: i * carousel.clientWidth, behavior: 'smooth' });
      updateCoachDots(i, total);
      if (i === total - 1) markCoachDayComplete(day.dayNumber);
    });
  });
}

function bindEvents() {
  document.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nav = btn.dataset.nav;
      if (nav === 'coach') store.coachCardIndex = 0;
      if (nav === 'grocery') {
        refreshGroceryList();
        store.showGroceryAdd = false;
      }
      store.screen = nav === 'setup' ? 'setup' : nav;
      store.expandedMeal = null;
      render();
    });
  });

  document.querySelectorAll('[data-seg]').forEach((row) => {
    row.querySelectorAll('button[data-val]').forEach((btn) => {
      btn.addEventListener('click', () => {
        row.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        row.parentElement.querySelector('input[type=hidden]').value = btn.dataset.val;
      });
    });
  });

  document.getElementById('setupForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const weight = Number(fd.get('totalWeight'));
    const fat = Number(fd.get('fatPercent'));
    const lbm = weight * (1 - fat / 100);
    store.profile = {
      preferredName: String(fd.get('preferredName')).trim(),
      sex: fd.get('sex'),
      age: Number(fd.get('age')),
      heightInches: Number(fd.get('heightInches')),
      totalWeight: weight,
      fatPercent: fat,
      leanBodyMass: lbm,
      workIntensity: Number(fd.get('workIntensity')),
      weightTrainingHours: Number(fd.get('weightTrainingHours')),
      cardioHours: Number(fd.get('cardioHours')),
      fatBurningHours: Number(fd.get('fatBurningHours')),
      wakeTime: fd.get('wakeTime'),
    };
    saveProfile();
    store.screen = 'plan';
    render();
  });

  document.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const label = btn.dataset.toggle;
      store.expandedMeal = store.expandedMeal === label ? null : label;
      render();
    });
  });

  document.querySelectorAll('[data-toggle-section]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sk = btn.dataset.toggleSection;
      store.expandedSections[sk] = !store.expandedSections[sk];
      render();
    });
  });

  document.querySelectorAll('[data-tab-key]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      store.sectionTabs[btn.dataset.tabKey] = btn.dataset.tabVal;
      render();
    });
  });

  document.querySelectorAll('[data-search]').forEach((input) => {
    input.addEventListener('input', () => {
      store.foodSearch[input.dataset.search] = input.value;
      render();
      const next = document.querySelector(`[data-search="${input.dataset.search}"]`);
      if (next) {
        next.focus();
        next.setSelectionRange(next.value.length, next.value.length);
      }
    });
    input.addEventListener('click', (e) => e.stopPropagation());
  });

  document.querySelectorAll('[data-log-food]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const slotLabel = btn.dataset.logSlot;
      const category = btn.dataset.logCategory;
      const servings = Number(btn.dataset.logServings) || 1;
      const food = store.foods.find((f) => f.name === decodeURIComponent(btn.dataset.logFood));
      if (!food) return;
      logFood(slotLabel, category, food, servings, {
        collapseSection: btn.dataset.collapse || null,
      });
    });
  });

  document.querySelectorAll('[data-clear-slot]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.expandedSections[btn.dataset.collapse] = false;
      removeCategoryEntry(btn.dataset.clearSlot, btn.dataset.clearCategory);
    });
  });

  document.querySelectorAll('[data-remove-fat-slot]').forEach((btn) => {
    btn.addEventListener('click', () => {
      removeOneFat(btn.dataset.removeFatSlot, decodeURIComponent(btn.dataset.removeFatName));
    });
  });

  bindCoachCarousel();

  document.querySelector('[data-open-grocery-add]')?.addEventListener('click', () => {
    store.showGroceryAdd = true;
    render();
  });

  document.querySelectorAll('[data-close-grocery-add]').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (el.classList.contains('sheet-backdrop') && e.target !== el) return;
      store.showGroceryAdd = false;
      render();
    });
  });

  document.querySelector('.sheet-panel')?.addEventListener('click', (e) => e.stopPropagation());

  document.querySelectorAll('[data-grocery-add-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.groceryAddTab = btn.dataset.groceryAddTab;
      render();
    });
  });

  document.querySelector('[data-grocery-add-search]')?.addEventListener('input', (e) => {
    store.groceryAddSearch = e.target.value;
    render();
    const next = document.querySelector('[data-grocery-add-search]');
    if (next) {
      next.focus();
      next.setSelectionRange(next.value.length, next.value.length);
    }
  });

  document.querySelectorAll('[data-grocery-add-food]').forEach((btn) => {
    btn.addEventListener('click', () => {
      addGroceryFood(decodeURIComponent(btn.dataset.groceryAddFood));
    });
  });

  document.querySelectorAll('[data-grocery-check]').forEach((btn) => {
    btn.addEventListener('click', () => toggleGroceryCheck(btn.dataset.groceryCheck));
  });

  document.querySelectorAll('[data-grocery-remove]').forEach((btn) => {
    btn.addEventListener('click', () => removeGroceryItem(btn.dataset.groceryRemove));
  });

  document.querySelector('[data-grocery-uncheck-all]')?.addEventListener('click', uncheckAllGrocery);
}

async function init() {
  load();
  store.screen = 'loading';
  render();
  try {
    const res = await fetch('data/foods.json');
    store.foods = await res.json();
  } catch (err) {
    console.error('Food database failed to load', err);
  }
  store.screen = store.profile?.leanBodyMass > 0 ? 'home' : 'setup';
  render();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
