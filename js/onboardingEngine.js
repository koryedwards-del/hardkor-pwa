export const WELCOME_COUNT = 7;
export const QUESTION_COUNT = 9;

export const WORK_PHYSICAL = [
  { id: 'sitting', label: 'Mostly sitting', sub: 'Desk, computer, driving, reception.' },
  { id: 'feet', label: 'On your feet', sub: 'Retail, teaching, nursing, restaurant.' },
  { id: 'carrying', label: 'Carrying & lifting', sub: 'Warehouse, construction, delivery, trades.' },
  { id: 'heavy', label: 'Heavy physical labor', sub: 'Moving heavy loads all day. Brick, concrete, roofing.' },
];

export const WORK_STRESS = [
  { id: 'comfortable', label: 'Comfortable', sub: 'Relaxed pace. Manageable demands.' },
  { id: 'busy', label: 'Busy', sub: 'Steady pace. Tired by end of day but manageable.' },
  { id: 'stressful', label: 'Stressful', sub: 'High pressure. You come home drained.' },
];

export const LOW_ACTIVITIES = [
  { id: 'dog', icon: '🐕', label: 'Walking the dog' },
  { id: 'house', icon: '🏠', label: 'Housework & chores' },
  { id: 'garden', icon: '🌱', label: 'Gardening & yard work' },
  { id: 'kids', icon: '👶', label: 'Chasing kids around' },
  { id: 'walk', icon: '🚶', label: 'Walking for exercise' },
  { id: 'yoga', icon: '🧘', label: 'Yoga or stretching' },
];

export function yearsInBusiness() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const anniversaryPassed = month > 6 || (month === 6 && day >= 1);
  return anniversaryPassed ? year - 1985 : year - 1985 - 1;
}

export function computeWorkIntensity(physical, stress) {
  if (!physical || !stress) return 2.0;
  const map = {
    'sitting|comfortable': 1.5,
    'sitting|busy': 2.0,
    'sitting|stressful': 2.0,
    'feet|comfortable': 2.5,
    'feet|busy': 2.5,
    'feet|stressful': 3.0,
    'carrying|comfortable': 3.0,
    'carrying|busy': 3.0,
    'carrying|stressful': 3.5,
    'heavy|comfortable': 3.5,
    'heavy|busy': 3.5,
    'heavy|stressful': 4.0,
  };
  return map[`${physical}|${stress}`] ?? 2.0;
}

export function reverseWorkIntensity(intensity) {
  if (intensity <= 1.5) return { physical: 'sitting', stress: 'comfortable' };
  if (intensity <= 2.0) return { physical: 'sitting', stress: 'busy' };
  if (intensity <= 2.5) return { physical: 'feet', stress: 'comfortable' };
  if (intensity <= 3.0) return { physical: 'carrying', stress: 'comfortable' };
  if (intensity <= 3.5) return { physical: 'heavy', stress: 'comfortable' };
  return { physical: 'heavy', stress: 'stressful' };
}

export function heartRates(age) {
  const maxHR = 220 - age;
  return {
    cardioLow: Math.floor(maxHR * 0.7),
    cardioHigh: Math.floor(maxHR * 0.85),
    fatBurnLow: Math.floor(maxHR * 0.6),
    fatBurnHigh: Math.floor(maxHR * 0.7),
  };
}

export function heightDisplay(inches) {
  const ft = Math.floor(inches / 12);
  const rem = Math.round(inches % 12);
  return `${ft}'${rem}"`;
}

export function formatWakeDisplay(wakeTime) {
  if (!wakeTime) return '—';
  const [hStr, mStr] = wakeTime.split(':');
  let h = Number(hStr);
  const m = Number(mStr);
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function defaultOnboardingForm(profile) {
  const p = profile || {};
  const work = reverseWorkIntensity(p.workIntensity ?? 2);
  return {
    preferredName: p.preferredName || '',
    sex: p.sex || 'Male',
    heightInches: p.heightInches ?? 68,
    age: p.age ?? 35,
    weightText: p.totalWeight > 0 ? String(Math.round(p.totalWeight)) : '',
    fatPercentText: p.fatPercent > 0 ? String(p.fatPercent) : '',
    fatSource: p.fatPercent > 0 ? 'recent' : '',
    workPhysical: p.workPhysical || work.physical,
    workStress: p.workStress || work.stress,
    weightTrainingHours: p.weightTrainingHours ?? 0,
    cardioHours: p.cardioHours ?? 0,
    fatBurningHours: p.fatBurningHours ?? 3,
    wakeTime: p.wakeTime || '06:00',
    remindersEnabled: p.remindersEnabled !== false,
    lowActivities: p.lowActivities || [],
  };
}

export function profileFromForm(form) {
  const weight = Number(form.weightText);
  const fatPercent = Number(form.fatPercentText);
  const lbm = weight * (1 - fatPercent / 100);
  const intensity = computeWorkIntensity(form.workPhysical, form.workStress);
  return {
    preferredName: form.preferredName.trim().replace(/\b\w/g, (c) => c.toUpperCase()),
    sex: form.sex,
    age: Number(form.age),
    heightInches: Number(form.heightInches),
    totalWeight: weight,
    fatPercent,
    leanBodyMass: lbm,
    workIntensity: intensity,
    workPhysical: form.workPhysical,
    workStress: form.workStress,
    weightTrainingHours: Number(form.weightTrainingHours),
    cardioHours: Number(form.cardioHours),
    fatBurningHours: Number(form.fatBurningHours),
    wakeTime: form.wakeTime,
    remindersEnabled: !!form.remindersEnabled,
    lowActivities: form.lowActivities || [],
  };
}

export function welcomeScreens() {
  const yrs = yearsInBusiness();
  return [
    {
      type: 'brand',
      tag: 'EAT TO LOSE FAT',
      line1: 'BURN',
      line2: '& BUILD.',
      line2Accent: true,
      sub: 'Burn fat. Build muscle.\nAt the same time.',
    },
    {
      line1: 'PUZZLED',
      line2: "WHY YOU CAN'T LOSE FAT?",
      body: "What to eat. How much to eat. When to eat. It shouldn't be this hard. We'll show you exactly how much to eat for what you do.",
    },
    {
      line1: 'YOUR',
      line2: 'PERFECT MATCH.',
      body: "Not by chance. Not by guessing. Built from your lean body mass, job, lifestyle, and activities. A food plan custom-fit to your body's particular demands.",
      quote: '"If you want to see real results like you never thought possible, this is the plan to be on because it dials everything in for each person. It\'s not a cookie-cutter diet."',
      attribution: '— Dave McAftery., client since 1990',
    },
    {
      line1: `${yrs} YEARS.`,
      line2: 'PROVEN.',
      body: 'More than 30,000 people — athletes, homemakers, teenagers, seniors. From 500 pounds to 100 pounds. One system. Every body.',
      quote: '"The exception to the \'too good to be true\' cliché."',
      attribution: '— Trudy, client since 1998',
    },
    {
      line1: 'ACCURACY',
      line2: 'MATTERS.',
      body: 'The Burn & Build Burn Engine uses your LBM, job, lifestyle and three categories of activities to customize your food plan to maximize fat loss and muscle gain.',
    },
    {
      line1: 'WHY',
      line2: "YOU'RE HERE.",
      body: "In my many years of doing seminars I found the three biggest motivators are weddings, cruises and class reunions. What's your motivator?",
    },
    {
      line1: 'READY?',
      line2: "LET'S BUILD.",
      body: "This takes a few minutes. It's worth it. When we're done, you'll have a food plan no other app can give you.",
      quote: '"I learned this program in 1992 and it has been invaluable. At 67, I am confident I can maintain and even build muscle and lose fat. Let\'s go!"',
      attribution: '— Linda Kay, client since 1992',
    },
  ];
}

export function onboardingPhase(page, isEditMode) {
  const start = isEditMode ? WELCOME_COUNT : 0;
  if (page < WELCOME_COUNT) return { kind: 'welcome', index: page };
  const qi = page - WELCOME_COUNT;
  if (qi < QUESTION_COUNT) return { kind: 'question', index: qi };
  if (qi === QUESTION_COUNT) return { kind: 'confirm' };
  return { kind: 'done' };
}

export function totalOnboardingPages() {
  return WELCOME_COUNT + QUESTION_COUNT + 2;
}

export function canProceed(phase, form) {
  switch (phase.kind) {
    case 'welcome':
      return true;
    case 'question':
      switch (phase.index) {
        case 0: return form.preferredName.trim().length > 0;
        case 3: return Number(form.weightText) > 0;
        case 4: return Number(form.fatPercentText) > 0 && form.fatSource;
        case 5: return !!form.workPhysical;
        case 6: return !!form.workStress;
        default: return true;
      }
    default:
      return true;
  }
}

export function nextLabel(phase, isEditMode) {
  if (phase.kind === 'welcome' && phase.index === 0) return 'GET STARTED  →';
  if (phase.kind === 'welcome') return 'NEXT  →';
  if (phase.kind === 'confirm') return isEditMode ? 'UPDATE MY PLAN  →' : "LET'S GO  →";
  if (phase.kind === 'done') return isEditMode ? 'DONE  →' : 'SEE YOUR FOOD PLAN  →';
  return 'NEXT  →';
}
