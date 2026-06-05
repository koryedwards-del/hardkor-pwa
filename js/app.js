import { computePlan, generateMealSlots } from './burnEngine.js';

const store = {
  profile: null,
  entries: [],
  foods: [],
  screen: 'loading',
  expandedMeal: null,
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

function load() {
  try {
    const p = localStorage.getItem('hardkor_profile');
    if (p) store.profile = JSON.parse(p);
    const e = localStorage.getItem('hardkor_entries');
    if (e) store.entries = JSON.parse(e);
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

function logFood(slotLabel, category, food, servings) {
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
    servingLabel: scaledLabel(food, servings),
    fatPoints: category === 'Fats' ? 1 : 0,
    loggedAt: Date.now(),
  });
  saveEntries();
  render();
}

function removeEntry(id) {
  store.entries = store.entries.filter((e) => e.id !== id);
  saveEntries();
  render();
}

function entryFor(slotLabel, category) {
  return todayEntries().find((e) => e.mealSlotLabel === slotLabel && e.category === category);
}

function entriesFor(slotLabel, category) {
  return todayEntries().filter((e) => e.mealSlotLabel === slotLabel && e.category === category);
}

function renderFoodSelect(slotLabel, category, servings, foodCats, label) {
  const foods = foodsForCategories(foodCats).sort((a, b) => a.name.localeCompare(b.name));
  const picked = category === 'Fats' ? entriesFor(slotLabel, category) : [entryFor(slotLabel, category)].filter(Boolean);

  return `
    <div class="category-block">
      <div class="cat-title">${label}</div>
      ${servings > 0 ? `<div class="servings">${fmtServings(servings)} servings</div>` : ''}
      <select data-pick="${slotLabel}|${category}|${servings}">
        <option value="">Select food…</option>
        ${foods.map((f) => `<option value="${f.name}">${f.name} — ${scaledLabel(f, servings || 1)}</option>`).join('')}
      </select>
      ${picked.map((e) => `
        <div class="picked">
          <span>${e.foodName} · ${e.servingLabel}</span>
          <button type="button" data-remove="${e.id}">Remove</button>
        </div>`).join('')}
    </div>`;
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
        const logged = todayEntries()
          .filter((e) => e.mealSlotLabel === slot.label)
          .map((e) => `${e.foodName} ${e.servingLabel}`);
        return `
        <div class="meal-card">
          <button type="button" class="meal-card-header" data-toggle="${slot.label}">
            <div>
              <div class="label">${slot.label}</div>
              ${!expanded && logged.length ? logged.map((l) => `<div class="logged">${l}</div>`).join('') : ''}
            </div>
            <div class="meta">
              <div>${slot.time}</div>
              <div class="expand">${expanded ? 'Close' : 'Expand'}</div>
            </div>
          </button>
          ${expanded ? `
          <div class="meal-body">
            ${slot.proteinServings > 0 ? renderFoodSelect(slot.label, 'Protein', slot.proteinServings, ['protein', 'dairy'], 'Protein') : ''}
            ${slot.grainStarchServings > 0 ? renderFoodSelect(slot.label, 'Grains / Starches', slot.grainStarchServings, ['starch', 'grain'], 'Grains / Starches') : ''}
            ${slot.vegetableServings > 0 ? renderFoodSelect(slot.label, 'Vegetables', slot.vegetableServings, ['vegetable'], 'Vegetables') : ''}
            ${slot.fruitServings > 0 ? renderFoodSelect(slot.label, 'Fruits', slot.fruitServings, ['fruit'], 'Fruits') : ''}
            ${renderFoodSelect(slot.label, 'Fats', 1, ['fat'], 'Extra fats')}
          </div>` : ''}
        </div>`;
      }).join('')}
      <div style="height:32px"></div>
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
  else root.innerHTML = renderHome();
  bindEvents();
}

function bindEvents() {
  document.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.screen = btn.dataset.nav === 'setup' ? 'setup' : btn.dataset.nav;
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

  document.querySelectorAll('select[data-pick]').forEach((sel) => {
    sel.addEventListener('change', () => {
      if (!sel.value) return;
      const [slotLabel, category, servingsStr] = sel.dataset.pick.split('|');
      const servings = Number(servingsStr) || 1;
      const food = store.foods.find((f) => f.name === sel.value);
      if (food) logFood(slotLabel, category, food, servings);
      sel.value = '';
    });
  });

  document.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => removeEntry(btn.dataset.remove));
  });
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
