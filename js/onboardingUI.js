import {
  LOW_ACTIVITIES,
  QUESTION_COUNT,
  WELCOME_COUNT,
  WORK_PHYSICAL,
  WORK_STRESS,
  canProceed,
  defaultOnboardingForm,
  formatWakeDisplay,
  heartRates,
  heightDisplay,
  nextLabel,
  onboardingPhase,
  profileFromForm,
  totalOnboardingPages,
  welcomeScreens,
} from './onboardingEngine.js';

function infoBox(icon, text) {
  return `<div class="ob-info"><span class="ob-info-icon">${icon}</span><p>${text}</p></div>`;
}

function stepHeader(step, title, subtitle, prefix = 'YOUR') {
  return `
    <div class="ob-step-header">
      <div class="ob-step-num">STEP ${step} OF ${QUESTION_COUNT}</div>
      <div class="ob-step-prefix">${prefix}</div>
      <h2 class="ob-step-title">${title}</h2>
      ${subtitle ? `<p class="ob-step-sub">${subtitle}</p>` : ''}
    </div>`;
}

function radioCard(name, value, selected, label, sub) {
  return `
    <label class="ob-radio ${selected ? 'selected' : ''}">
      <input type="radio" name="${name}" value="${value}" ${selected ? 'checked' : ''} />
      <div>
        <div class="ob-radio-label">${label}</div>
        ${sub ? `<div class="ob-radio-sub">${sub}</div>` : ''}
      </div>
    </label>`;
}

function renderWelcome(screen, index) {
  if (screen.type === 'brand') {
    return `
      <div class="ob-welcome ob-welcome-brand">
        <div class="ob-brand-tag">${screen.tag}</div>
        <div class="ob-brand-line1">${screen.line1}</div>
        <div class="ob-brand-line2"><span class="ob-brand-amp">& </span><span class="ob-brand-accent">${screen.line2.replace('& ', '')}</span></div>
        <p class="ob-brand-sub">${screen.sub.replace('\n', '<br>')}</p>
      </div>`;
  }
  return `
    <div class="ob-welcome">
      <div class="ob-welcome-headline">
        <div class="ob-welcome-line1">${screen.line1}</div>
        <div class="ob-welcome-line2">${screen.line2}</div>
      </div>
      <p class="ob-welcome-body">${screen.body}</p>
      ${screen.quote ? `
        <div class="ob-quote">
          <p>${screen.quote}</p>
          <div class="ob-quote-by">${screen.attribution}</div>
        </div>` : ''}
    </div>`;
}

function renderQuestion(index, form) {
  const hr = heartRates(Number(form.age));
  switch (index) {
    case 0:
      return `
        ${stepHeader(1, 'NAME', "What's your first name?")}
        <input class="ob-input ob-input-lg" name="preferredName" value="${form.preferredName}" placeholder="Your first name" autocomplete="given-name" />
        <div class="ob-field-label">SEX</div>
        <div class="ob-seg">
          <button type="button" class="${form.sex === 'Male' ? 'active' : ''}" data-ob-sex="Male">Male</button>
          <button type="button" class="${form.sex === 'Female' ? 'active' : ''}" data-ob-sex="Female">Female</button>
        </div>
        ${infoBox('👋', 'We use your name to personalize your experience throughout the app.')}`;

    case 1:
      return `
        ${stepHeader(2, 'HEIGHT', 'Used to determine your fat burn and cardiovascular training heart rate targets.')}
        <div class="ob-big-value">${heightDisplay(form.heightInches)}</div>
        <div class="ob-big-sub">${Math.round(form.heightInches)} inches</div>
        <input type="range" class="ob-range" name="heightInches" min="48" max="84" step="1" value="${form.heightInches}" />
        <div class="ob-range-labels"><span>4'0"</span><span>7'0"</span></div>
        ${infoBox('💡', 'Your lean body mass is your fat burner. More muscle burns more fat.')}`;

    case 2:
      return `
        ${stepHeader(3, 'YEARS OF EXPERIENCE.', '')}
        <div class="ob-big-value ob-big-age">${form.age}</div>
        <input type="range" class="ob-range" name="age" min="13" max="99" step="1" value="${form.age}" />
        <div class="ob-range-labels"><span>13</span><span>99</span></div>
        ${infoBox('❤️', 'Your age is used to calculate your personal fat burning (60–70%) and cardio training (70–85%) heart rate zones.')}`;

    case 3:
      return `
        ${stepHeader(4, 'WEIGHT', '', 'YOUR CURRENT')}
        ${infoBox('🎯', "For best results, don't guess your weight. Your entire plan depends on the accuracy of this number.")}
        <div class="ob-weight-row">
          <input class="ob-input ob-weight-input" name="weightText" inputmode="decimal" value="${form.weightText}" placeholder="000" />
          <span class="ob-unit">lbs</span>
        </div>
        ${infoBox('⚖️', 'Your best weight is in the morning — after you go to the bathroom and before you eat.')}`;

    case 4:
      return `
        ${stepHeader(5, 'BODY FAT', 'How do you know your body fat percentage?')}
        ${radioCard('fatSource', 'dexa', form.fatSource === 'dexa', 'DEXA Scan', 'Gold standard. The more recent the better.')}
        ${form.fatSource === 'dexa' ? renderFatInput(form) : ''}
        ${radioCard('fatSource', 'recent', form.fatSource === 'recent', 'Other method', 'Calipers, ultrasound, or BodPod. The more recent the better.')}
        ${form.fatSource === 'recent' ? renderFatInput(form) : ''}
        ${radioCard('fatSource', 'guess', form.fatSource === 'guess', "I'm guessing", "If you guess right, you're golden. If you guess wrong, your plan is wrong.")}
        ${form.fatSource === 'guess' ? renderFatInput(form) : ''}`;

    case 5:
      return `
        ${stepHeader(6, 'WORKDAY', 'How physical is your work?<br>Choose the one that most closely describes your typical work week.')}
        <div class="ob-section-label">PHYSICAL LEVEL</div>
        ${WORK_PHYSICAL.map((o) => radioCard('workPhysical', o.id, form.workPhysical === o.id, o.label, o.sub)).join('')}`;

    case 6:
      return `
        ${stepHeader(7, 'LIFESTYLE', 'Choose the one that most closely describes your life.', 'YOUR')}
        ${WORK_STRESS.map((o) => radioCard('workStress', o.id, form.workStress === o.id, o.label, o.sub)).join('')}
        ${infoBox('🧠', 'Stress increases cortisol. Cortisol increases hunger and promotes fat storage — even if you\'re sitting at a desk all day. Your plan accounts for this.')}`;

    case 7:
      return `
        ${stepHeader(8, 'EXERCISE', 'What do you plan to do exercise wise in the next 8 weeks? Be realistic — conservative is better. You can always update your plan.')}
        <div class="ob-section-label">WEIGHT TRAINING, RACQUET SPORTS</div>
        <p class="ob-exercise-desc">Weight training, racquet sports type activity. Count only the time with weight in your hand or actually moving — not the rest between sets.</p>
        <div class="ob-slider-label">Total hours per week: <strong>${form.weightTrainingHours}</strong></div>
        <input type="range" class="ob-range" name="weightTrainingHours" min="0" max="15" step="1" value="${form.weightTrainingHours}" />
        <div class="ob-divider"></div>
        <div class="ob-section-label">CARDIOVASCULAR TRAINING</div>
        <div class="ob-hr-label">HEART RATE ${hr.cardioLow}–${hr.cardioHigh} BPM</div>
        <div class="ob-slider-label">Total hours per week: <strong>${form.cardioHours}</strong></div>
        <input type="range" class="ob-range" name="cardioHours" min="0" max="15" step="1" value="${form.cardioHours}" />
        <div class="ob-divider"></div>
        <div class="ob-section-label">FAT BURNING</div>
        <div class="ob-hr-label">HEART RATE ${hr.fatBurnLow}–${hr.fatBurnHigh} BPM</div>
        ${LOW_ACTIVITIES.map((a) => `
          <label class="ob-check ${form.lowActivities.includes(a.id) ? 'selected' : ''}">
            <input type="checkbox" name="lowActivity" value="${a.id}" ${form.lowActivities.includes(a.id) ? 'checked' : ''} />
            <span>${a.icon}</span>
            <span>${a.label}</span>
          </label>`).join('')}
        <div class="ob-slider-label">Total hours per week: <strong>${form.fatBurningHours}</strong></div>
        <input type="range" class="ob-range" name="fatBurningHours" min="0" max="20" step="1" value="${form.fatBurningHours}" />
        ${infoBox('😊', "Everyone does at least 3 hours of something a week. Even housework and carrying groceries count. Don't sell yourself short.")}`;

    case 8:
      return `
        ${stepHeader(9, 'WAKE TIME', 'Eating every 2–3 hours keeps your fat burners (muscles) burning.')}
        <input type="time" class="ob-input ob-time-input" name="wakeTime" value="${form.wakeTime}" />
        <div class="ob-divider"></div>
        <div class="ob-section-label">MEAL REMINDERS</div>
        <button type="button" class="ob-reminder-toggle ${form.remindersEnabled ? 'on' : ''}" data-ob-reminders>
          <div>
            <div class="ob-reminder-title">Time-to-eat reminders</div>
            <div class="ob-reminder-sub">${form.remindersEnabled ? 'Burn & Build will notify you when it\'s time to eat each meal and fruit snack.' : 'No reminders set.'}</div>
          </div>
          <span class="ob-toggle-pill"></span>
        </button>`;

    default:
      return '';
  }
}

function renderFatInput(form) {
  return `
    <div class="ob-fat-input">
      <div class="ob-fat-label">Enter your body fat percentage:</div>
      <div class="ob-weight-row">
        <input class="ob-input ob-weight-input" name="fatPercentText" inputmode="decimal" value="${form.fatPercentText}" placeholder="00" />
        <span class="ob-unit">%</span>
      </div>
    </div>`;
}

function confirmRow(label, value, subtitle, editPage) {
  return `
    <button type="button" class="ob-confirm-row" ${editPage != null ? `data-ob-goto="${editPage}"` : ''}>
      <div>
        <div class="ob-confirm-label">${label}</div>
        ${subtitle ? `<div class="ob-confirm-sub">${subtitle}</div>` : ''}
      </div>
      <div class="ob-confirm-value">${value}${editPage != null ? ' <span class="ob-edit">Edit</span>' : ''}</div>
    </button>`;
}

function renderConfirm(form, isEditMode) {
  const weight = Number(form.weightText);
  const fat = Number(form.fatPercentText);
  const lbm = weight * (1 - fat / 100);
  const hr = heartRates(Number(form.age));
  const phys = WORK_PHYSICAL.find((w) => w.id === form.workPhysical);
  const stress = WORK_STRESS.find((w) => w.id === form.workStress);
  const base = WELCOME_COUNT;

  return `
    <div class="ob-confirm">
      <div class="ob-confirm-kicker">${isEditMode ? 'REVIEW CHANGES' : 'ALMOST THERE'}</div>
      <div class="ob-welcome-line1">${isEditMode ? 'EDIT YOUR' : 'ARE THESE'}</div>
      <div class="ob-welcome-line2">${isEditMode ? 'PLAN' : 'CORRECT?'}</div>
      <div class="ob-confirm-rows">
        ${confirmRow('NAME', form.preferredName || '—', '', base)}
        ${confirmRow('SEX', form.sex, '', base)}
        ${confirmRow('HEIGHT', heightDisplay(form.heightInches), '', base + 1)}
        ${confirmRow('AGE', String(form.age), '', base + 2)}
        ${confirmRow('WEIGHT', weight > 0 ? `${form.weightText} lbs` : '—', '', base + 3)}
        ${confirmRow('BODY FAT', fat > 0 ? `${form.fatPercentText}%` : '—', '', base + 4)}
        ${confirmRow('LEAN BODY MASS', lbm > 0 ? `${lbm.toFixed(1)} lbs` : '—', '', null)}
        ${confirmRow('WORKDAY', phys?.label || '—', '', base + 5)}
        ${confirmRow('LIFESTYLE', stress?.label || '—', '', base + 6)}
        ${confirmRow('WEIGHT TRAINING, RACQUET SPORTS', `${form.weightTrainingHours} hrs/week`, '', base + 7)}
        ${confirmRow('CARDIOVASCULAR TRAINING', `${form.cardioHours} hrs/week`, `HEART RATE ${hr.cardioLow}–${hr.cardioHigh} BPM`, base + 7)}
        ${confirmRow('FAT BURNING', `${form.fatBurningHours} hrs/week`, `HEART RATE ${hr.fatBurnLow}–${hr.fatBurnHigh} BPM`, base + 7)}
        ${confirmRow('WAKE TIME', formatWakeDisplay(form.wakeTime), '', base + 8)}
        ${confirmRow('MEAL REMINDERS', form.remindersEnabled ? 'On' : 'Off', '', base + 8)}
      </div>
      <div class="ob-ready-box">
        <div class="ob-ready-kicker">${isEditMode ? '⚡ YOUR PLAN WILL BE UPDATED' : '⚡ YOUR PLAN IS READY'}</div>
        <p>Based on ${lbm.toFixed(1)} lbs of lean body mass, your custom food plan will show you exactly how many servings of protein, carbs, and fat you need each day to lose fat as fast as possible.</p>
      </div>
    </div>`;
}

function renderDone(isEditMode) {
  if (isEditMode) {
    return `
      <div class="ob-done">
        <div class="ob-done-check">✓</div>
        <div class="ob-welcome-line1">PLAN</div>
        <div class="ob-welcome-line2">UPDATED.</div>
        <p class="ob-done-body">Your food plan has been recalculated based on your updated numbers.</p>
        <p class="ob-done-sub">New servings. Same system.<br>Keep going.</p>
      </div>`;
  }
  return `
    <div class="ob-done">
      <div class="ob-done-check">✓</div>
      <div class="ob-welcome-line1">YOU'RE</div>
      <div class="ob-welcome-line2">SET.</div>
      <p class="ob-done-body">Your custom food plan is calculated from your lean body mass, job, lifestyle, and activities.</p>
      <p class="ob-done-sub">Eat the food. Trust the plan.</p>
    </div>`;
}

export function renderOnboarding(store) {
  const form = store.onboardingForm;
  const page = store.onboardingPage;
  const isEditMode = store.onboardingEditMode;
  const phase = onboardingPhase(page, isEditMode);
  const start = isEditMode ? WELCOME_COUNT : 0;
  const progressTotal = totalOnboardingPages() - 1 - start;
  const progressCurrent = page - start;
  const screens = welcomeScreens();
  const proceed = canProceed(phase, form);

  let content = '';
  if (phase.kind === 'welcome') content = renderWelcome(screens[phase.index], phase.index);
  else if (phase.kind === 'question') content = `<div class="ob-question">${renderQuestion(phase.index, form)}</div>`;
  else if (phase.kind === 'confirm') content = renderConfirm(form, isEditMode);
  else content = renderDone(isEditMode);

  const showBar = phase.kind !== 'done';
  const showBack = page > start;

  return `
    <div class="ob-flow">
      ${showBar ? `
      <div class="ob-top">
        ${showBack ? '<button type="button" class="ob-back" data-ob-back>←</button>' : (isEditMode ? '<button type="button" class="ob-back" data-nav="home">×</button>' : '<span class="ob-back-spacer"></span>')}
        <div class="ob-progress">${Array.from({ length: progressTotal }, (_, i) => `<span class="${i <= progressCurrent ? 'filled' : ''}"></span>`).join('')}</div>
      </div>` : ''}
      <div class="ob-content">${content}</div>
      <div class="ob-footer">
        <button type="button" class="ob-next ${proceed ? '' : 'disabled'}" data-ob-next ${proceed ? '' : 'disabled'}>${nextLabel(phase, isEditMode)}</button>
      </div>
    </div>`;
}

export function initOnboardingForm(store) {
  store.onboardingForm = defaultOnboardingForm(store.profile);
}

export { profileFromForm, onboardingPhase, WELCOME_COUNT };

export function bindOnboardingEvents(store, { render, onComplete }) {
  const form = store.onboardingForm;

  document.querySelector('[data-ob-back]')?.addEventListener('click', () => {
    if (store.onboardingPage > 0) {
      store.onboardingPage -= 1;
      render();
    }
  });

  document.querySelector('[data-ob-next]')?.addEventListener('click', () => {
    const phase = onboardingPhase(store.onboardingPage, store.onboardingEditMode);
    if (!canProceed(phase, form)) return;

    if (phase.kind === 'confirm') {
      store.profile = profileFromForm(form);
      localStorage.setItem('hardkor_profile', JSON.stringify(store.profile));
      localStorage.setItem('hardkor_onboarding_complete', 'true');
      store.onboardingPage += 1;
      render();
      return;
    }

    if (phase.kind === 'done') {
      onComplete();
      return;
    }

    store.onboardingPage += 1;
    render();
  });

  document.querySelectorAll('[data-ob-goto]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.onboardingPage = Number(btn.dataset.obGoto);
      render();
    });
  });

  document.querySelectorAll('[data-ob-sex]').forEach((btn) => {
    btn.addEventListener('click', () => {
      form.sex = btn.dataset.obSex;
      render();
    });
  });

  document.querySelector('[data-ob-reminders]')?.addEventListener('click', () => {
    form.remindersEnabled = !form.remindersEnabled;
    render();
  });

  document.querySelectorAll('input[name="fatSource"]').forEach((input) => {
    input.addEventListener('change', () => {
      form.fatSource = input.value;
      render();
    });
  });

  document.querySelectorAll('input[name="workPhysical"]').forEach((input) => {
    input.addEventListener('change', () => {
      form.workPhysical = input.value;
      render();
    });
  });

  document.querySelectorAll('input[name="workStress"]').forEach((input) => {
    input.addEventListener('change', () => {
      form.workStress = input.value;
      render();
    });
  });

  document.querySelectorAll('input[name="lowActivity"]').forEach((input) => {
    input.addEventListener('change', () => {
      const set = new Set(form.lowActivities);
      if (input.checked) set.add(input.value);
      else set.delete(input.value);
      form.lowActivities = [...set];
      render();
    });
  });

  document.querySelectorAll('.ob-flow input, .ob-flow textarea').forEach((input) => {
    if (!input.name) return;
    const update = () => {
      if (input.type === 'range' || input.type === 'number') form[input.name] = Number(input.value);
      else form[input.name] = input.value;
      render();
    };
    input.addEventListener('input', update);
    input.addEventListener('change', update);
  });
}
