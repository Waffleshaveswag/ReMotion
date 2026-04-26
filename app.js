/* ── ReMotion App ── */

// ── Calibration test definitions ──────────────────────────────────────────────
const CALIB_TESTS = [
  {
    id: 1, name: 'Rest Baseline', totalSeconds: 120,
    description: '2 minutes · Records baseline muscle signal · No movement',
    sensorState: 'resting',
    mA: null,
    steps: [
      { label: '', seconds: 120, instruction: 'Sit with your arm flat on the table, completely relaxed. Do not move intentionally. The system is reading your baseline EMG noise floor and any resting tremor (4–6 Hz).', state: 'resting' }
    ]
  },
  {
    id: 2, name: 'Lifting & Moving Arm', totalSeconds: 120,
    description: '2 minutes · Calibrates deltoid, biceps, triceps · ~20–30 mA',
    sensorState: 'movement',
    mA: '20–30',
    steps: [
      { label: 'Step 1 — Lift arm to shoulder height', seconds: 60, instruction: 'Slowly raise your arm from resting position to shoulder height and lower it. The sleeve is calibrating FES current for your deltoid and biceps. Target: 20–30 mA.', state: 'active' },
      { label: 'Step 2 — Move arm forward and back', seconds: 60, instruction: 'Extend your arm forward then return it. Repeat slowly. The system maps the muscle activation needed for reaching movements.', state: 'active' }
    ]
  },
  {
    id: 3, name: 'Writing / Eating Utensil', totalSeconds: 120,
    description: '2 minutes · Calibrates forearm flexors · ~20–25 mA',
    sensorState: 'force',
    mA: '20–25',
    steps: [
      { label: 'Step 1 — Hold a pen grip', seconds: 60, instruction: 'Hold a pen in your normal writing grip. The system calibrates the flexor digitorum superficialis and flexor carpi radialis for fine grip. Target: 20–25 mA.', state: 'intent' },
      { label: 'Step 2 — Draw a line on paper', seconds: 60, instruction: 'Draw a straight line slowly across the paper. The system calibrates the micro-corrections needed for writing and utensil use.', state: 'fes_active' }
    ]
  },
  {
    id: 4, name: 'Grab Light Object', totalSeconds: 120,
    description: '2 minutes · Calibrates hand/finger muscles · ~20–30 mA',
    sensorState: 'force',
    mA: '20–30',
    steps: [
      { label: 'Step 1 — Reach and grip', seconds: 60, instruction: 'Reach for the light object (cup of water) and close your hand around it. The system calibrates the lumbricals, flexor pollicis brevis, and abductor pollicis brevis. Target: 20–30 mA.', state: 'intent' },
      { label: 'Step 2 — Lift and hold', seconds: 60, instruction: 'Lift the object and hold it in the air for a few seconds, then set it down. Repeat. Mapping sustained grip force vs. FES amplitude.', state: 'fes_active' }
    ]
  },
  {
    id: 5, name: 'Grab Heavy Object', totalSeconds: 120,
    description: '2 minutes · Full forearm + hand activation · ~30–50 mA',
    sensorState: 'force',
    mA: '30–50',
    steps: [
      { label: 'Step 1 — Grip heavy object', seconds: 60, instruction: 'Grip the heavier object (e.g. full water bottle). The system increases FES amplitude to engage brachioradialis, flexor carpi ulnaris, and serratus anterior. Target: 30–50 mA. Safety limit: 50 mA.', state: 'fes_active' },
      { label: 'Step 2 — Lift and transfer', seconds: 60, instruction: 'Lift the object and move it to the other side of the table. The system validates that FES shuts off immediately if rigidity is detected mid-lift.', state: 'fes_active' }
    ]
  },
  {
    id: 6, name: 'Daily Tasks Simulation', totalSeconds: 180,
    description: '3 minutes · FES active · Real-world validation',
    sensorState: 'fes_active',
    mA: '20–50',
    steps: [
      { label: 'Task 1 — Changing clothes (button)', seconds: 60, instruction: 'Fasten a shirt button. This is one of the hardest daily tasks — requires coordinated pinch grip and fine wrist movement. FES adapts per muscle in real time.', state: 'fes_active' },
      { label: 'Task 2 — Grab water / food', seconds: 60, instruction: 'Pick up a glass of water and bring it to your mouth. Tests the full arm chain: deltoid, biceps, wrist flexors, and grip — all working together.', state: 'fes_active' },
      { label: 'Task 3 — Open hand / release', seconds: 60, instruction: 'Fully open your hand flat on the table, then close it. Calibrates extensor carpi radialis and hand opening muscles — critical for safe object release.', state: 'active' }
    ]
  }
];

// ── Utilities ──────────────────────────────────────────────────────────────────
function formatTime(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2,'0')}`;
}
function formatDuration(sec) {
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec/60)}m ${sec%60}s`;
}
function formatHHMMSS(sec) {
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max+1)); }

function formatDateShort(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}
function formatTimeShort(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
}

// ── EMG Simulator ─────────────────────────────────────────────────────────────
const Sim = {
  t: 0,
  next(state) {
    this.t += 0.05;
    const t = this.t;
    let sig = (Math.random() - 0.5) * 6; // baseline noise

    if (state === 'resting') {
      sig += (Math.random() - 0.5) * 3;
    } else if (state === 'resting_tremor') {
      sig += Math.sin(2 * Math.PI * 4.8 * t) * 85 + Math.sin(2 * Math.PI * 5.1 * t) * 35;
      sig += (Math.random() - 0.5) * 20;
    } else if (state === 'postural_tremor') {
      sig += Math.sin(2 * Math.PI * 6.2 * t) * 65 + Math.sin(2 * Math.PI * 6.8 * t) * 25;
      sig += (Math.random() - 0.5) * 18;
    } else if (state === 'kinetic_tremor') {
      sig += Math.sin(2 * Math.PI * 5.5 * t) * 55 + Math.sin(2 * Math.PI * 4 * t) * 20;
      sig += Math.sin(t * 1.5) * 30; // movement envelope
      sig += (Math.random() - 0.5) * 25;
    } else if (state === 'intention_tremor') {
      sig += Math.sin(2 * Math.PI * 4.2 * t) * 95 * (0.5 + 0.5 * Math.abs(Math.sin(t * 0.4)));
      sig += (Math.random() - 0.5) * 30;
    } else if (state === 'active') {
      const burst = Math.max(0, Math.sin(t * 3));
      sig += burst * 200 + (Math.random() - 0.5) * 40;
    } else if (state === 'intent') {
      sig += Math.max(0, Math.sin(t * 1.2)) * 160 + (Math.random() - 0.5) * 30;
    } else if (state === 'sub_intent') {
      sig += (Math.random() - 0.5) * 25 + Math.sin(t * 0.5) * 18;
    } else if (state === 'movement') {
      const env = 0.5 + 0.5 * Math.sin(t * 2);
      sig += env * (150 + (Math.random() - 0.5) * 40);
    } else if (state === 'force') {
      sig += Math.abs(Math.sin(t * 0.8)) * 140 + (Math.random() - 0.5) * 35;
    } else if (state === 'fes_active') {
      sig += Math.abs(Math.sin(t * 2.5)) * 180 + (Math.random() - 0.5) * 50;
      if (Math.random() < 0.08) sig += rand(100, 200); // FES artifact spike
    }
    return Math.round(sig);
  },

  imu(active) {
    this.t += 0; // shared t
    const t = this.t;
    if (!active) return { vel: (Math.random()-0.5)*0.8, target: 0 };
    const vel = Math.abs(Math.sin(t * 1.8)) * 70 + rand(-8, 8);
    const target = 65;
    return { vel: Math.round(vel), target };
  },

  fes(state, vel, target) {
    if (state !== 'fes_active') return 0;
    const diff = target - vel;
    if (diff < 5) return 0;
    return Math.min(Math.round(20 + diff * 0.4 + rand(0, 3)), 50); // hard cap 50 mA
  }
};

// ── Data Store ────────────────────────────────────────────────────────────────
const Store = {
  patient()        { return JSON.parse(localStorage.getItem('nb_patient') || 'null'); },
  savePatient(p)   { localStorage.setItem('nb_patient', JSON.stringify(p)); },
  calibration()    { return JSON.parse(localStorage.getItem('nb_calibration') || 'null'); },
  saveCalibration(c){ localStorage.setItem('nb_calibration', JSON.stringify(c)); },
  sessions()       { return JSON.parse(localStorage.getItem('nb_sessions') || '[]'); },
  saveSessions(s)  { localStorage.setItem('nb_sessions', JSON.stringify(s)); },
  addSession(s)    {
    const sessions = this.sessions();
    sessions.unshift(s);
    this.saveSessions(sessions);
  },
  clearAll() {
    localStorage.removeItem('nb_patient');
    localStorage.removeItem('nb_calibration');
    localStorage.removeItem('nb_sessions');
  }
};

// ── Chart helpers ─────────────────────────────────────────────────────────────
const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  resizeDelay: 0,
  animation: { duration: 0 },
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
  elements: { point: { radius: 0 } },
  scales: {
    x: { display: false },
    y: {
      grid: { color: 'rgba(0,0,0,0.05)' },
      ticks: { color: '#6b6b6b', font: { size: 10, family: "'JetBrains Mono'" }, maxTicksLimit: 4 }
    }
  }
};

function mkChart(id, datasets, yMin, yMax) {
  const canvas = document.getElementById(id);
  if (!canvas) return null;
  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: Array(200).fill(''),
      datasets: datasets.map(d => ({
        data: Array(200).fill(0),
        borderColor: d.color,
        backgroundColor: d.fill || 'transparent',
        borderWidth: d.width || 1.5,
        tension: 0.3,
        fill: !!d.fill,
        ...d
      }))
    },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        ...CHART_DEFAULTS.scales,
        y: { ...CHART_DEFAULTS.scales.y, min: yMin, max: yMax }
      }
    }
  });
}

function pushVal(chart, ...values) {
  if (!chart) return;
  chart.data.datasets.forEach((ds, i) => {
    ds.data.shift();
    ds.data.push(values[i] ?? values[0]);
  });
  chart.data.labels.shift();
  chart.data.labels.push('');
  chart.update('none');
}

// ── Calibration module ────────────────────────────────────────────────────────
const CalibModule = {
  testIdx: 0,
  stepIdx: 0,
  secondsLeft: 0,
  totalTestSeconds: 0,
  running: false,
  paused: false,
  intervalId: null,
  emgIntervalId: null,
  chart: null,

  get currentTest()  { return CALIB_TESTS[this.testIdx]; },
  get currentStep()  { return this.currentTest.steps[this.stepIdx]; },

  init() {
    this.chart = mkChart('chart-calib-emg',
      [{ color: '#0d9488', fill: 'rgba(13,148,136,0.08)', width: 1.5 }],
      -250, 250
    );
  },

  start() {
    this.testIdx = 0; this.stepIdx = 0;
    this.running = true; this.paused = false;
    document.getElementById('calib-idle').classList.add('hidden');
    document.getElementById('calib-running').classList.remove('hidden');
    this.updateStepUI();
    this.startTimers();
    this.log(`Calibration started — ${new Date().toLocaleTimeString()}`, 'accent');
    this.log('Test 1: Rest Baseline — 3 minutes', 'info');
  },

  startTimers() {
    this.secondsLeft = this.currentStep.seconds;
    this.totalTestSeconds = this.currentStep.seconds;
    clearInterval(this.intervalId);
    clearInterval(this.emgIntervalId);

    this.intervalId = setInterval(() => this._tick(), 1000);
    this.emgIntervalId = setInterval(() => this._emgTick(), 50);
  },

  _tick() {
    if (this.paused) return;
    this.secondsLeft--;
    this.updateTimer();
    if (this.secondsLeft <= 0) this.advanceStep();
  },

  _emgTick() {
    if (!this.running || this.paused) return;
    const state = this.currentStep ? this.currentStep.state : 'resting';
    const val = Sim.next(state);
    pushVal(this.chart, val);
    this.updateEMGStats(state, val);
  },

  advanceStep() {
    const test = this.currentTest;
    if (this.stepIdx < test.steps.length - 1) {
      this.stepIdx++;
      this.log(`→ ${this.currentStep.label}`, 'info');
      this.updateStepUI();
      this.secondsLeft = this.currentStep.seconds;
      this.totalTestSeconds = this.currentStep.seconds;
    } else {
      this.advanceTest();
    }
  },

  advanceTest() {
    this.log(`✓ Test ${this.testIdx + 1} complete`, 'ok');
    this.markStepDone(this.testIdx + 1);
    if (this.testIdx < CALIB_TESTS.length - 1) {
      this.testIdx++;
      this.stepIdx = 0;
      const t = this.currentTest;
      this.log(`Starting Test ${t.id}: ${t.name}`, 'accent');
      this.updateStepUI();
      this.secondsLeft = this.currentStep.seconds;
      this.totalTestSeconds = this.currentStep.seconds;
    } else {
      this.complete();
    }
  },

  skip() {
    this.advanceStep();
  },

  togglePause() {
    this.paused = !this.paused;
    document.getElementById('calib-pause-btn').textContent = this.paused ? 'Resume' : 'Pause';
    if (this.paused) this.log('⏸ Paused', 'warn');
    else this.log('▶ Resumed', 'info');
  },

  reset() {
    clearInterval(this.intervalId);
    clearInterval(this.emgIntervalId);
    this.running = false; this.paused = false;
    this.testIdx = 0; this.stepIdx = 0;

    document.getElementById('calib-idle').classList.remove('hidden');
    document.getElementById('calib-running').classList.add('hidden');
    document.getElementById('calib-done').classList.add('hidden');

    document.querySelectorAll('.progress-steps .step').forEach(s => {
      s.classList.remove('active','done');
    });
    document.querySelectorAll('.step-line').forEach(l => l.classList.remove('done'));
    document.getElementById('calib-log').innerHTML = '';
    document.getElementById('calib-pause-btn').textContent = 'Pause';
    this.log('Protocol reset.', 'warn');
  },

  complete() {
    clearInterval(this.intervalId);
    clearInterval(this.emgIntervalId);
    this.running = false;

    // Build calibration result
    const calibData = {
      completedAt: new Date().toISOString(),
      noiseFloor: `${randInt(3,7)} µV`,
      tremorFreq: `${(4.5 + rand(-0.5,0.5)).toFixed(1)} Hz`,
      mA_armLift:  `${randInt(20,30)} mA`,
      mA_utensil:  `${randInt(20,25)} mA`,
      mA_lightGrab:`${randInt(20,30)} mA`,
      mA_heavyGrab:`${randInt(30,50)} mA`,
      rigidityProtection: 'Active',
      classifierAcc: `${randInt(91,98)}%`
    };
    Store.saveCalibration(calibData);

    document.getElementById('calib-running').classList.add('hidden');
    document.getElementById('calib-done').classList.remove('hidden');
    this.markStepDone(6);

    // Summary table
    const summaryEl = document.getElementById('calib-done-summary');
    summaryEl.innerHTML = [
      ['Noise Floor', calibData.noiseFloor],
      ['Resting Tremor', calibData.tremorFreq],
      ['Arm Lift / Move', calibData.mA_armLift],
      ['Writing / Utensil', calibData.mA_utensil],
      ['Grab Light Object', calibData.mA_lightGrab],
      ['Grab Heavy Object', calibData.mA_heavyGrab],
      ['Rigidity Protection', calibData.rigidityProtection],
      ['Signal Accuracy', calibData.classifierAcc]
    ].map(([k,v]) => `
      <div class="calib-summary-item">
        <span>${k}</span>
        <span class="calib-summary-val">${v}</span>
      </div>`).join('');

    this.log('✓ All 6 tests complete. Calibration data saved.', 'ok');
    app.dashboard.refresh();
  },

  updateStepUI() {
    const test = this.currentTest;
    const step = this.currentStep;
    document.getElementById('calib-test-badge').textContent = `TASK ${test.id} OF 6`;
    document.getElementById('calib-test-name').textContent = test.name;
    document.getElementById('calib-test-dur').textContent = test.description;
    document.getElementById('calib-sub-label').textContent = test.steps.length > 1 ? step.label : '';
    document.getElementById('calib-instructions').textContent = step.instruction;
    this.updateStepHighlight();
    document.getElementById('calib-next-btn').disabled = false;
  },

  updateStepHighlight() {
    document.querySelectorAll('.progress-steps .step').forEach((el, i) => {
      el.classList.remove('active','done');
      if (i < this.testIdx) el.classList.add('done');
      else if (i === this.testIdx) el.classList.add('active');
    });
    document.querySelectorAll('.step-line').forEach((el, i) => {
      el.classList.toggle('done', i < this.testIdx);
    });
  },

  markStepDone(testNum) {
    const el = document.querySelector(`.progress-steps .step[data-step="${testNum}"]`);
    if (el) { el.classList.remove('active'); el.classList.add('done'); }
  },

  updateTimer() {
    document.getElementById('calib-timer').textContent = formatTime(this.secondsLeft);
    const circ = 314.16;
    const elapsed = this.totalTestSeconds - this.secondsLeft;
    const offset = circ * (elapsed / this.totalTestSeconds);
    document.getElementById('ring-progress').style.strokeDashoffset = offset;
  },

  updateEMGStats(state, val) {
    const absVal = Math.abs(val);
    document.getElementById('emg-amp').textContent = `${absVal} µV`;
    document.getElementById('emg-noise').textContent = `${randInt(3,7)} µV`;

    let freq = '—', stateLabel = 'Resting';
    const pill = document.getElementById('calib-sig-state');
    pill.className = 'sig-state-pill';

    if (state.includes('tremor')) {
      freq = `${(4.5 + rand(-0.8,0.8)).toFixed(1)} Hz`;
      stateLabel = 'Tremor'; pill.classList.add('tremor');
    } else if (state === 'sub_intent') {
      freq = '—'; stateLabel = 'Sub-intent'; pill.classList.add('intent');
    } else if (state === 'active' || state === 'movement' || state === 'fes_active') {
      freq = `${(12 + rand(-2,2)).toFixed(1)} Hz`; stateLabel = state === 'fes_active' ? 'FES Active' : 'Active';
      pill.classList.add('active');
    } else if (state === 'intent' || state === 'force') {
      freq = `${(8 + rand(-1,1)).toFixed(1)} Hz`; stateLabel = 'Intent';
      pill.classList.add('intent');
    } else {
      pill.classList.add('resting');
    }

    document.getElementById('emg-freq').textContent = freq;
    document.getElementById('emg-state').textContent = stateLabel;
    document.getElementById('calib-sig-state').textContent = stateLabel;
  },

  log(msg, type = 'info') {
    const el = document.getElementById('calib-log');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    const time = new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    entry.textContent = `[${time}] ${msg}`;
    el.appendChild(entry);
    el.scrollTop = el.scrollHeight;
  },

  clearLog() { document.getElementById('calib-log').innerHTML = ''; }
};

// ── Tracker module ────────────────────────────────────────────────────────────
const TrackerModule = {
  running: false,
  seconds: 0,
  fesCount: 0,
  rigidityActive: false,
  rigidityAlerts: 0,
  intervalId: null,
  emgIntervalId: null,
  charts: {},

  init() {
    this.charts.emg = mkChart('chart-tracker-emg', [
      { color: '#0d9488', fill: 'rgba(13,148,136,0.06)', width: 1.5 },
      { color: '#2dd6d6', fill: false, width: 1.2 }
    ], -250, 250);

    this.charts.imu = mkChart('chart-tracker-imu', [
      { color: '#16a34a', fill: 'rgba(22,163,74,0.07)', width: 1.5 },
      { color: '#f59e0b', fill: false, width: 1, borderDash: [4,4] }
    ], 0, 120);

    this.charts.fes = mkChart('chart-tracker-fes', [
      { color: '#0d9488', fill: 'rgba(13,148,136,0.10)', width: 1.5 }
    ], 0, 55);
  },

  toggle() {
    if (this.running) this.stop(); else this.start();
  },

  start() {
    const calib = Store.calibration();
    if (!calib) {
      this.logEvent('⚠ No calibration data. Complete calibration first.', 'warn');
      return;
    }
    this.running = true;
    this.seconds = 0;
    this.fesCount = 0;
    this.rigidityActive = false;
    this.rigidityAlerts = 0;
    Sim.t = 0;

    document.getElementById('tracker-toggle-btn').textContent = 'Stop Session';
    document.getElementById('tracker-toggle-btn').style.background = 'var(--danger)';
    document.getElementById('tracker-status-label').textContent = 'Session active';

    this.intervalId = setInterval(() => this._tick(), 1000);
    this.emgIntervalId = setInterval(() => this._emgTick(), 50);
    this.logEvent('Session started', 'ok');
    this.logEvent(`Calibration: ${calib.classifierAcc} accuracy`, 'info');
  },

  stop() {
    clearInterval(this.intervalId);
    clearInterval(this.emgIntervalId);
    this.running = false;

    document.getElementById('tracker-toggle-btn').textContent = 'Start Session';
    document.getElementById('tracker-toggle-btn').style.background = '';
    document.getElementById('tracker-status-label').textContent = `Session ended — ${formatHHMMSS(this.seconds)}`;

    const tremorIndex = randInt(28, 65);
    const velocityScore = randInt(52, 88);
    const session = {
      id: Date.now(),
      date: new Date().toISOString(),
      duration: this.seconds,
      tremorIndex,
      velocityScore,
      fesEvents: this.fesCount
    };
    Store.addSession(session);
    this.logEvent(`Session saved — Tremor: ${tremorIndex}, Velocity: ${velocityScore}%`, 'ok');
    app.dashboard.refresh();
  },

  _tick() {
    this.seconds++;
    document.getElementById('t-time').textContent = formatHHMMSS(this.seconds);

    // Simulate rigidity event (~every 40–90s)
    if (!this.rigidityActive && this.seconds > 10 && this.seconds % randInt(40,90) === 0) {
      this.rigidityActive = true;
      this.rigidityAlerts++;
      const rigEl = document.getElementById('t-rigidity');
      rigEl.textContent = '⚠ DETECTED';
      rigEl.style.color = 'var(--danger)';
      this.logEvent('⚠ Rigidity detected — FES halted', 'warn');
      // Auto-resume after 4 seconds
      setTimeout(() => {
        this.rigidityActive = false;
        rigEl.textContent = 'Clear';
        rigEl.style.color = 'var(--success)';
        this.logEvent('✓ Rigidity cleared — FES resumed', 'ok');
      }, 4000);
    }

    // Simulate periodic FES assist events
    if (!this.rigidityActive && this.seconds % randInt(8,15) === 0) {
      this.fesCount++;
      document.getElementById('t-fes').textContent = this.fesCount;
      this.logEvent(`FES assist — ${randInt(20,45)} mA`, 'fes');
    }
  },

  _emgTick() {
    const raw = Sim.next('resting_tremor');
    const filtered = Math.round(raw * 0.45 + (Math.random()-0.5)*8);
    const imu = Sim.imu(true);
    // FES is zero when rigidity active (safety cutoff)
    const fes = (!this.rigidityActive && this.fesCount > 0)
      ? Math.min(Sim.fes('fes_active', imu.vel, imu.target), 50)
      : 0;

    pushVal(this.charts.emg, raw, filtered);
    pushVal(this.charts.imu, imu.vel, imu.target);
    pushVal(this.charts.fes, fes);

    // Update live stats periodically
    if (Math.random() < 0.04) {
      document.getElementById('t-freq').textContent = `${(4.5+rand(-0.8,0.8)).toFixed(1)} Hz`;
      document.getElementById('t-amp').textContent  = `${(1.1+rand(-0.3,0.3)).toFixed(1)} mm`;
      document.getElementById('t-vel').textContent  = `${randInt(55,90)}%`;
    }
  },

  logEvent(msg, type = 'info') {
    const el = document.getElementById('tracker-event-log');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    const t = new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    entry.textContent = `[${t}] ${msg}`;
    el.appendChild(entry);
    el.scrollTop = el.scrollHeight;
  }
};

// ── Dashboard module ──────────────────────────────────────────────────────────
const DashModule = {
  charts: {},

  init() {
    this.charts.tremor = new Chart(document.getElementById('chart-tremor-trend'), {
      type: 'line',
      data: { labels: [], datasets: [{ data: [], borderColor: '#0d9488', backgroundColor: 'rgba(13,148,136,0.07)', borderWidth: 2, tension: 0.4, fill: true, pointRadius: 3, pointBackgroundColor: '#0d9488' }] },
      options: { ...CHART_DEFAULTS, plugins: { legend: { display: false }, tooltip: { enabled: true } }, elements: { point: { radius: 3 } } }
    });

    this.charts.bar = new Chart(document.getElementById('chart-session-bar'), {
      type: 'bar',
      data: { labels: [], datasets: [{ data: [], backgroundColor: 'rgba(13,148,136,0.45)', borderColor: '#0d9488', borderWidth: 1, borderRadius: 2 }] },
      options: {
        ...CHART_DEFAULTS,
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        scales: { x: { grid: { display: false }, ticks: { color: '#6b6b6b', font: { size: 10 } } }, y: { ...CHART_DEFAULTS.scales.y, min: 0 } }
      }
    });

    this.refresh();
  },

  refresh() {
    const sessions = Store.sessions();
    const calib = Store.calibration();
    const patient = Store.patient();

    // Stats
    const now = new Date();
    const weekAgo = new Date(now - 7*24*60*60*1000);
    const weekSessions = sessions.filter(s => new Date(s.date) > weekAgo);
    const ssEl = document.getElementById('stat-sessions');
    const stEl = document.getElementById('stat-total');
    if (ssEl) ssEl.textContent = weekSessions.length;
    if (stEl) stEl.textContent = sessions.length;

    if (sessions.length > 0) {
      const latest = sessions[0];
      const trEl = document.getElementById('stat-tremor');
      const veEl = document.getElementById('stat-velocity');
      if (trEl) trEl.textContent = latest.tremorIndex;
      if (veEl) veEl.textContent = latest.velocityScore + '%';
    }

    if (calib) {
      const scEl = document.getElementById('stat-calib');
      const sdEl = document.getElementById('stat-calib-date');
      if (scEl) scEl.textContent = 'Complete';
      if (sdEl) sdEl.textContent = `Last: ${formatDateShort(calib.completedAt)}`;
    }

    // Nav patient chip + hero widget
    const patientChip = document.getElementById('nav-patient');
    if (patientChip) patientChip.textContent = patient ? patient.name : '';
    const hwSes = document.getElementById('hw-sessions');
    if (hwSes) hwSes.textContent = sessions.length;
    const hwCal = document.getElementById('hw-calib');
    if (hwCal) hwCal.textContent = calib ? 'Done' : 'None';

    // News card row — inject session cards when sessions exist
    const newsRow = document.getElementById('home-news-row');
    if (newsRow && sessions.length > 0) {
      const recent = sessions.slice(0, 2);
      const sessionCards = recent.map(s => {
        const tremClass = s.tremorIndex < 40 ? 'pill-good' : s.tremorIndex < 65 ? 'pill-warn' : 'pill-bad';
        const velClass  = s.velocityScore > 75 ? 'pill-good' : s.velocityScore > 55 ? 'pill-warn' : 'pill-bad';
        return `
        <div class="news-card">
          <div class="news-card__content">
            <p class="news-card__pretitle">Session · ${formatDateShort(s.date)}</p>
            <h3 class="news-card__title">${formatTimeShort(s.date)} — ${formatDuration(s.duration)} session</h3>
            <p class="news-card__desc">
              FES events: ${s.fesEvents} &nbsp;·&nbsp;
              <span style="color:var(--${s.tremorIndex<40?'success':s.tremorIndex<65?'warning':'danger'})">Tremor ${s.tremorIndex}</span> &nbsp;·&nbsp;
              <span style="color:var(--${s.velocityScore>75?'success':s.velocityScore>55?'warning':'danger'})">Velocity ${s.velocityScore}%</span>
            </p>
            <div class="news-card__cta" onclick="app.navigate('history')">View History →</div>
          </div>
        </div>`;
      }).join('');

      const aiCard = `
        <div class="news-card">
          <div class="news-card__content">
            <p class="news-card__pretitle">NAE v1.2 · AI Analysis</p>
            <h3 class="news-card__title">${sessions.length} session${sessions.length !== 1 ? 's' : ''} recorded — insights ready</h3>
            <p class="news-card__desc">Your neural analysis engine has enough data to generate detailed FES recommendations and tremor trend analysis.</p>
            <div class="news-card__cta" onclick="app.navigate('ai')">View AI Insights →</div>
          </div>
        </div>`;

      newsRow.innerHTML = sessionCards + aiCard;
    }

    // Charts
    this.updateCharts(sessions);
  },

  updateCharts(sessions) {
    // Tremor trend (last 30 sessions or dummy)
    const tData = sessions.slice(0,30).reverse();
    if (tData.length > 0) {
      this.charts.tremor.data.labels = tData.map(s => formatDateShort(s.date).split(' ').slice(0,2).join(' '));
      this.charts.tremor.data.datasets[0].data = tData.map(s => s.tremorIndex);
    } else {
      // Show dummy historical data
      const days = Array.from({length:30},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-29+i); return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'}); });
      this.charts.tremor.data.labels = days;
      this.charts.tremor.data.datasets[0].data = days.map(()=>randInt(30,75));
    }
    this.charts.tremor.update();

    // Session activity bar (last 14 days)
    const last14 = Array.from({length:14},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-13+i); return d; });
    const counts = last14.map(day => sessions.filter(s => new Date(s.date).toDateString() === day.toDateString()).length);
    this.charts.bar.data.labels = last14.map(d=>d.toLocaleDateString('en-GB',{day:'numeric',month:'short'}));
    this.charts.bar.data.datasets[0].data = counts;
    this.charts.bar.update();
  }
};

// ── History module ────────────────────────────────────────────────────────────
const HistoryModule = {
  chart: null,

  init() {
    this.chart = new Chart(document.getElementById('chart-history-trend'), {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          { data: [], label: 'Tremor', borderColor: '#c0392b', backgroundColor: 'rgba(192,57,43,0.05)', borderWidth: 2, tension: 0.4, fill: true, pointRadius: 3 },
          { data: [], label: 'Velocity', borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.05)', borderWidth: 2, tension: 0.4, fill: true, pointRadius: 3 }
        ]
      },
      options: { ...CHART_DEFAULTS, plugins: { legend: { display: false }, tooltip: { enabled: true } }, elements: { point: { radius: 3 } } }
    });
  },

  render() {
    const sessions = Store.sessions();
    document.getElementById('history-count').textContent = `${sessions.length} session${sessions.length!==1?'s':''} recorded`;

    const listEl = document.getElementById('history-sessions-list');
    if (sessions.length === 0) {
      listEl.innerHTML = '<div class="empty-state">No sessions recorded yet.</div>';
    } else {
      listEl.innerHTML = sessions.map(s => {
        const tremClass = s.tremorIndex < 40 ? 'pill-good' : s.tremorIndex < 65 ? 'pill-warn' : 'pill-bad';
        const velClass  = s.velocityScore > 75 ? 'pill-good' : s.velocityScore > 55 ? 'pill-warn' : 'pill-bad';
        return `
        <div class="session-card">
          <div>
            <div class="session-date">${formatDateShort(s.date)} — ${formatTimeShort(s.date)}</div>
            <div class="session-meta">Duration: ${formatDuration(s.duration)} · FES events: ${s.fesEvents}</div>
          </div>
          <div class="session-pills">
            <div class="session-pill ${tremClass}">Tremor ${s.tremorIndex}</div>
            <div class="session-pill ${velClass}">Velocity ${s.velocityScore}%</div>
            <div class="session-pill">FES ${s.fesEvents}</div>
          </div>
        </div>`;
      }).join('');
    }

    // Trend chart
    const rev = sessions.slice(0,30).reverse();
    this.chart.data.labels = rev.map(s=>formatDateShort(s.date).split(' ').slice(0,2).join(' '));
    this.chart.data.datasets[0].data = rev.map(s=>s.tremorIndex);
    this.chart.data.datasets[1].data = rev.map(s=>s.velocityScore);
    this.chart.update();
  },

  exportCSV() {
    const sessions = Store.sessions();
    if (!sessions.length) { alert('No sessions to export.'); return; }
    const header = 'Date,Time,Duration(s),TremorIndex,VelocityScore,FESEvents';
    const rows = sessions.map(s =>
      `${formatDateShort(s.date)},${formatTimeShort(s.date)},${s.duration},${s.tremorIndex},${s.velocityScore},${s.fesEvents}`
    );
    const csv = [header,...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `remotion-sessions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }
};

// ── Profile module ────────────────────────────────────────────────────────────
const ProfileModule = {
  render() {
    const p = Store.patient();
    if (!p) return;
    document.getElementById('prof-name').value = p.name || '';
    document.getElementById('prof-dob').value = p.dob || '';
    document.getElementById('prof-dx-year').value = p.dxYear || '';
    document.getElementById('prof-condition').value = p.condition || 'parkinsons';
    document.getElementById('prof-notes').value = p.notes || '';
    document.querySelectorAll('input[name="prof-hand"]').forEach(r => { r.checked = r.value === (p.hand||'right'); });

    const calib = Store.calibration();
    const summaryEl = document.getElementById('prof-calib-summary');
    if (!calib) {
      summaryEl.innerHTML = '<div class="empty-state small">No calibration data yet.</div>';
    } else {
      summaryEl.innerHTML = [
        ['Completed', formatDateShort(calib.completedAt)],
        ['Noise Floor', calib.noiseFloor],
        ['Tremor Freq', calib.tremorFreq],
        ['Arm Lift / Move', calib.mA_armLift || '—'],
        ['Writing / Utensil', calib.mA_utensil || '—'],
        ['Grab Light', calib.mA_lightGrab || '—'],
        ['Grab Heavy', calib.mA_heavyGrab || '—'],
        ['Signal Accuracy', calib.classifierAcc]
      ].map(([k,v])=>`
        <div class="prof-calib-row">
          <span>${k}</span>
          <span class="prof-calib-val">${v}</span>
        </div>`).join('');
    }
  },

  save() {
    const hand = document.querySelector('input[name="prof-hand"]:checked');
    const p = {
      name: document.getElementById('prof-name').value,
      dob: document.getElementById('prof-dob').value,
      dxYear: document.getElementById('prof-dx-year').value,
      condition: document.getElementById('prof-condition').value,
      hand: hand ? hand.value : 'right',
      notes: document.getElementById('prof-notes').value
    };
    Store.savePatient(p);
    document.getElementById('nav-patient').textContent = p.name || 'No patient';
    DashModule.refresh();
    // Flash feedback
    const btn = document.querySelector('.view.active .btn-primary');
    if (btn) { const t = btn.textContent; btn.textContent = 'Saved ✓'; setTimeout(()=>btn.textContent=t, 1500); }
  },

  clearData() {
    if (confirm('Delete ALL patient data, calibration and sessions? This cannot be undone.')) {
      Store.clearAll();
      location.reload();
    }
  }
};

// ── AI Insights module ────────────────────────────────────────────────────────
const AIModule = {

  analyze() {
    const calib   = Store.calibration();
    const patient = Store.patient();
    const sessions = Store.sessions();

    const noCalibEl  = document.getElementById('ai-no-calib');
    const resultsEl  = document.getElementById('ai-results');

    if (!calib) {
      noCalibEl.style.display = '';
      resultsEl.style.display = 'none';
      return;
    }
    noCalibEl.style.display = 'none';
    resultsEl.style.display = '';

    // Parse mA values from calibration strings like "24 mA"
    const parseMA = str => str ? parseInt(str) || 0 : 0;
    const mAArm    = parseMA(calib.mA_armLift);
    const mAWrite  = parseMA(calib.mA_utensil);
    const mALight  = parseMA(calib.mA_lightGrab);
    const mAHeavy  = parseMA(calib.mA_heavyGrab);
    const allMA    = [mAArm, mAWrite, mALight, mAHeavy].filter(v => v > 0);
    const avgMA    = Math.round(allMA.reduce((a,b) => a+b, 0) / allMA.length);
    const peakMA   = Math.max(...allMA);
    const tremorHz = parseFloat(calib.tremorFreq) || 4.8;

    // Estimated session energy: avg_mA × duty_cycle × session_time (rough µJ→mJ)
    const estEnergyMJ = Math.round(avgMA * 0.3 * 1800 * 0.001);

    const condition = 'parkinsons';
    const conditionLabel = "Parkinson's Disease";

    // Tremor type classification
    let tremorType;
    if (tremorHz < 5) {
      tremorType = 'Resting tremor (4–5 Hz)';
    } else if (tremorHz < 7) {
      tremorType = 'Postural tremor (5–7 Hz)';
    } else {
      tremorType = 'Kinetic tremor (7+ Hz)';
    }

    // Confidence based on signal quality
    const confBase = parseInt(calib.classifierAcc) || 94;
    const confidence = `${confBase}%`;

    // ── Render confidence + conclusion
    document.getElementById('ai-confidence').textContent = confidence;
    document.getElementById('ai-avg-ma').textContent   = `${avgMA} mA`;
    document.getElementById('ai-peak-ma').textContent  = `${peakMA} mA`;
    document.getElementById('ai-tremor-freq').textContent = `${tremorHz.toFixed(1)} Hz`;
    document.getElementById('ai-tremor-type').textContent = tremorType;
    document.getElementById('ai-total-energy').textContent = `${estEnergyMJ} mJ`;

    document.getElementById('ai-conclusion').textContent = this._buildConclusion(
      conditionLabel, avgMA, peakMA, tremorHz, tremorType, calib, sessions
    );

    // ── Muscle group bars
    const muscles = [
      { name: 'Deltoid / Biceps (Arm Lift)',   ma: mAArm,   max: 50, color: '#0a8a8a' },
      { name: 'Flexor Carpi (Writing)',         ma: mAWrite, max: 50, color: '#076060' },
      { name: 'Lumbricals (Light Grip)',        ma: mALight, max: 50, color: '#2dd6d6' },
      { name: 'Brachioradialis (Heavy Lift)',   ma: mAHeavy, max: 50, color: '#14b8b8' },
    ];
    document.getElementById('ai-muscle-bars').innerHTML = muscles.map(m => `
      <div class="ai-bar-row">
        <div class="ai-bar-meta">
          <span class="ai-bar-name">${m.name}</span>
          <span class="ai-bar-val" style="color:${m.color}">${m.ma} mA</span>
        </div>
        <div class="ai-bar-track">
          <div class="ai-bar-fill" style="width:${(m.ma/m.max)*100}%;background:${m.color}"></div>
        </div>
      </div>`).join('');

    // ── Signal quality scores
    const scores = [
      { label: 'EMG Signal Clarity',    pct: randInt(78, 96) },
      { label: 'Noise Floor Quality',   pct: randInt(80, 95) },
      { label: 'Electrode Contact',     pct: randInt(85, 99) },
      { label: 'Baseline Stability',    pct: randInt(75, 94) },
      { label: 'FES Response Accuracy', pct: confBase        },
    ];
    document.getElementById('ai-signal-scores').innerHTML = scores.map(s => {
      const stars = Math.round(s.pct / 20);
      const starHTML = Array.from({length:5},(_,i) =>
        `<div class="ai-star ${i < stars ? 'on' : ''}"></div>`).join('');
      return `
        <div class="ai-score-row">
          <span class="ai-score-label">${s.label}</span>
          <div class="ai-score-stars">${starHTML}</div>
          <span class="ai-score-pct">${s.pct}%</span>
        </div>`;
    }).join('');

    // ── Recommendations
    const recs = this._buildRecs(condition, avgMA, peakMA, tremorHz, sessions);
    document.getElementById('ai-recommendations').innerHTML = recs.map(r => `
      <div class="ai-rec-item rec-${r.type}">
        <span class="ai-rec-icon">${r.icon}</span>
        <span class="ai-rec-text"><strong>${r.title}</strong> — ${r.body}</span>
      </div>`).join('');

    // ── Session trend (if sessions exist)
    const trendCard = document.getElementById('ai-trend-card');
    if (sessions.length >= 2) {
      trendCard.style.display = '';
      const recent5 = sessions.slice(0, 5);
      const avgTremor   = Math.round(recent5.reduce((a,s) => a+s.tremorIndex, 0) / recent5.length);
      const avgVelocity = Math.round(recent5.reduce((a,s) => a+s.velocityScore, 0) / recent5.length);
      const first = sessions[sessions.length - 1];
      const last  = sessions[0];
      const tremorDelta = last.tremorIndex - first.tremorIndex;
      const dirClass = tremorDelta < -3 ? 'trend-down' : tremorDelta > 3 ? 'trend-up' : 'trend-flat';
      const dirLabel = tremorDelta < -3 ? `↓ ${Math.abs(tremorDelta)} pts improved` : tremorDelta > 3 ? `↑ ${tremorDelta} pts worsened` : '→ stable';
      document.getElementById('ai-trend-summary').innerHTML = `
        <div class="ai-trend-item">
          <div class="ai-trend-lbl">Avg Tremor Index (last ${recent5.length})</div>
          <div class="ai-trend-val">${avgTremor}</div>
          <div class="ai-trend-dir ${dirClass}">${dirLabel}</div>
        </div>
        <div class="ai-trend-item">
          <div class="ai-trend-lbl">Avg Velocity Score</div>
          <div class="ai-trend-val">${avgVelocity}%</div>
          <div class="ai-trend-dir ${avgVelocity > 70 ? 'trend-down' : 'trend-up'}">${avgVelocity > 70 ? '✓ above target' : '⚠ below target'}</div>
        </div>
        <div class="ai-trend-item">
          <div class="ai-trend-lbl">Total Sessions</div>
          <div class="ai-trend-val">${sessions.length}</div>
          <div class="ai-trend-dir trend-flat">recorded</div>
        </div>`;
    } else {
      trendCard.style.display = 'none';
    }
  },

  _buildConclusion(condition, avgMA, peakMA, tremorHz, tremorType, calib, sessions) {
    const sessionNote = sessions.length > 0
      ? ` Across ${sessions.length} recorded session${sessions.length > 1 ? 's' : ''}, the system has collected sufficient data to refine stimulation parameters.`
      : ' No live sessions have been recorded yet — run a tracking session to improve model accuracy.';

    const energyNote = peakMA >= 40
      ? `Peak FES demand reached ${peakMA} mA during heavy-load tasks, indicating significant neuromuscular support is required for loaded movements.`
      : `Peak FES demand of ${peakMA} mA suggests moderate neuromuscular support requirements across all calibrated tasks.`;

    return `Patient presents with ${condition}, exhibiting a ${tremorType.toLowerCase()} at ${tremorHz.toFixed(1)} Hz. ` +
      `Calibration baseline established a noise floor of ${calib.noiseFloor} with a signal classification accuracy of ${calib.classifierAcc}. ` +
      `Mean FES amplitude across all task groups is ${avgMA} mA. ${energyNote} ` +
      `Rigidity protection is ${calib.rigidityProtection.toLowerCase()} — stimulation will halt automatically if co-contraction is detected.` +
      sessionNote;
  },

  _buildRecs(condition, avgMA, peakMA, tremorHz, sessions) {
    const recs = [];

    if (peakMA >= 45) {
      recs.push({ type:'warn', icon:'⚠', title:'High Peak Demand',
        body:`Heavy-grip tasks require up to ${peakMA} mA. Ensure sleeve electrodes are checked before each session and a clinician is present for loaded movements.` });
    } else {
      recs.push({ type:'good', icon:'✓', title:'FES Levels Within Safe Range',
        body:`All calibrated tasks fall within the 20–50 mA therapeutic window. No parameter adjustments needed at this time.` });
    }

    if (tremorHz < 5) {
      recs.push({ type:'info', icon:'ℹ', title:'Resting Tremor Protocol Active',
        body:`Low-frequency resting tremor detected (${tremorHz.toFixed(1)} Hz). The model applies a notch filter at this frequency during FES delivery to avoid resonance amplification.` });
    } else if (tremorHz >= 6) {
      recs.push({ type:'warn', icon:'〰', title:'Elevated Tremor Frequency',
        body:`Kinetic/postural tremor at ${tremorHz.toFixed(1)} Hz requires adaptive FES timing. Consider increasing session frequency to build muscle memory and reduce compensatory tremor.` });
    }

    if (condition === 'parkinsons') {
      recs.push({ type:'info', icon:'📋', title:'Progressive Condition Protocol',
        body:`Re-calibrate every 4–6 weeks to account for disease progression. Muscle activation thresholds may shift over time, requiring updated FES baselines.` });
    }

    if (sessions.length === 0) {
      recs.push({ type:'warn', icon:'▶', title:'No Sessions Recorded',
        body:`Start a live tracking session to allow the model to refine its FES delivery predictions. At least 3 sessions are recommended before drawing clinical conclusions.` });
    } else if (sessions.length >= 3) {
      const avgTremor = Math.round(sessions.slice(0,3).reduce((a,s) => a+s.tremorIndex, 0) / 3);
      recs.push({ type:'good', icon:'📈', title:'Sufficient Session History',
        body:`With ${sessions.length} sessions recorded, the model has a reliable baseline. Recent average tremor index is ${avgTremor} — ${avgTremor < 45 ? 'within expected therapeutic range' : 'above target; consider increasing session frequency'}.` });
    }

    recs.push({ type:'info', icon:'💡', title:'Optimised Session Duration',
      body:`Based on your calibrated FES energy of ~${Math.round(avgMA * 0.3 * 1800 * 0.001)} mJ per 30-minute session, sessions between 20–40 minutes are recommended to prevent muscle fatigue.` });

    return recs;
  }
};

// ── Navigation ────────────────────────────────────────────────────────────────
function navigate(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const viewEl = document.getElementById(`view-${view}`);
  if (viewEl) viewEl.classList.add('active');

  document.querySelectorAll('.site-nav__link').forEach(n => {
    n.classList.toggle('active', n.dataset.view === view);
  });

  const shell = document.getElementById('app-shell');
  if (shell) shell.scrollTop = 0;

  if (view === 'history') HistoryModule.render();
  if (view === 'profile') ProfileModule.render();
  if (view === 'ai') AIModule.analyze();
  return false;
}

// ── First-run setup ───────────────────────────────────────────────────────────
function showSetup() {
  document.getElementById('setup-modal').classList.remove('hidden');
  document.getElementById('setup-form').addEventListener('submit', e => {
    e.preventDefault();
    const hand = document.querySelector('input[name="setup-hand"]:checked');
    const patient = {
      name: document.getElementById('setup-name').value,
      dob: document.getElementById('setup-dob').value,
      dxYear: document.getElementById('setup-dx-year').value,
      condition: document.getElementById('setup-condition').value,
      hand: hand ? hand.value : 'right',
      notes: ''
    };
    Store.savePatient(patient);
    document.getElementById('setup-modal').classList.add('hidden');
    DashModule.refresh();
  });
}

// ── App object (exposed globally for onclick handlers) ────────────────────────
window.app = {
  navigate,
  calibration: {
    start:       () => CalibModule.start(),
    togglePause: () => CalibModule.togglePause(),
    skip:        () => CalibModule.skip(),
    reset:       () => CalibModule.reset(),
    clearLog:    () => CalibModule.clearLog()
  },
  tracker: {
    toggle: () => TrackerModule.toggle()
  },
  history: {
    exportCSV: () => HistoryModule.exportCSV()
  },
  profile: {
    save:      () => ProfileModule.save(),
    clearData: () => ProfileModule.clearData()
  },
  dashboard: {
    refresh: () => DashModule.refresh()
  },
  ai: {
    analyze: () => AIModule.analyze()
  }
};

// ── Bionic arm charge animation ───────────────────────────────────────────────
function initBionicArm() {
  const chargeRect = document.getElementById('charge-rect');
  const energyDot  = document.getElementById('energy-dot');
  const armCharged = document.getElementById('arm-charged');
  if (!chargeRect || !energyDot) return;

  const H = 265;
  let level = 0;        // 0→1
  let phase = 'charging'; // 'charging' | 'hold' | 'reset'
  let holdTick = 0;

  function tick() {
    if (phase === 'charging') {
      level += 0.005;
      if (level >= 1) { level = 1; phase = 'hold'; holdTick = 0; }
    } else if (phase === 'hold') {
      holdTick++;
      if (holdTick > 90) phase = 'reset';
    } else {
      level -= 0.022;
      if (level <= 0) { level = 0; phase = 'charging'; }
    }

    // Grow clip rect upward from bottom
    const filled = level * H;
    chargeRect.setAttribute('y',      H - filled);
    chargeRect.setAttribute('height', filled);

    // Energy dot rises ahead of the charge front
    if (phase === 'charging' && level < 0.96) {
      const dotY = H - filled - 6;
      energyDot.setAttribute('cy', dotY);
      energyDot.setAttribute('r',  3 + level * 3);
      energyDot.setAttribute('opacity', 0.7 + level * 0.3);
    } else {
      energyDot.setAttribute('opacity', '0');
    }

    // Pulse glow when fully charged
    if (phase === 'hold') {
      armCharged.classList.add('fully-charged');
    } else {
      armCharged.classList.remove('fully-charged');
    }

    requestAnimationFrame(tick);
  }
  tick();
}

// ── Intro screen ─────────────────────────────────────────────────────────────
function initIntro() {
  const screen = document.getElementById('intro-screen');
  const btn    = document.getElementById('intro-enter-btn');
  const canvas = document.getElementById('intro-bg-canvas');
  if (!screen || !btn) return;

  btn.addEventListener('click', () => {
    screen.classList.add('hidden');
    setTimeout(() => { screen.remove(); }, 750);
  });
}

// ── Intel squares animation (nav bar background) ─────────────────────────────
function initIntelSquares() {
  const canvas = document.getElementById('nav-squares-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const SQ = 8;
  const GAP = 3;
  const STEP = SQ + GAP;

  let cols, rows, squares;

  function build() {
    canvas.width  = canvas.offsetWidth  || window.innerWidth;
    canvas.height = canvas.offsetHeight || 56;
    cols = Math.ceil(canvas.width  / STEP) + 1;
    rows = Math.ceil(canvas.height / STEP) + 1;

    squares = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        squares.push({
          x: c * STEP,
          y: r * STEP,
          bright: Math.random() * 0.3,
          phase: (c * 0.5 + r * 1.2) + Math.random() * 2,
          speed: 0.3 + Math.random() * 0.4,
        });
      }
    }
  }

  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    t += 0.014;

    for (const sq of squares) {
      const wave = 0.5 + 0.5 * Math.sin(t * sq.speed + sq.phase);
      const bright = Math.max(0, Math.min(1, wave * 0.85 + sq.bright * 0.15));

      // Teal tones: dark teal → light teal
      const rv = 13;
      const gv = Math.round(48  + bright * 168); // 48→216
      const bv = Math.round(44  + bright * 150); // 44→194
      const a  = 0.06 + bright * 0.52;

      ctx.fillStyle = `rgba(${rv},${gv},${bv},${a})`;
      ctx.fillRect(sq.x, sq.y, SQ, SQ);
    }

    requestAnimationFrame(draw);
  }

  build();
  draw();
  window.addEventListener('resize', build);
}

// ── Hero neural-network particle canvas ──────────────────────────────────────
function initHeroBg() {
  const canvas = document.getElementById('hero-bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const NODE_COUNT  = 58;
  const MAX_DIST    = 145;
  const REPEL_DIST  = 120;
  const REPEL_FORCE = 2.8;
  const MAX_SPEED   = 4;
  let nodes = [];
  let mouse = { x: -9999, y: -9999 };

  const section = canvas.parentElement;
  section.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  section.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

  const COLORS = ['#1C4E48', '#2A7A72', '#1a5c55', '#1C4E48', '#2A7A72', '#0f3d38'];

  function resize() {
    canvas.width  = section ? section.offsetWidth  : window.innerWidth;
    canvas.height = section ? section.offsetHeight : 600;
    nodes = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x:     Math.random() * canvas.width,
        y:     Math.random() * canvas.height,
        vx:    (Math.random() - 0.5) * 0.38,
        vy:    (Math.random() - 0.5) * 0.38,
        baseVx: (Math.random() - 0.5) * 0.38,
        baseVy: (Math.random() - 0.5) * 0.38,
        r:     Math.random() * 2.2 + 0.9,
        phase: Math.random() * Math.PI * 2,
        col:   COLORS[Math.floor(Math.random() * COLORS.length)]
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const n of nodes) {
      // Repulsion from cursor
      const dx = n.x - mouse.x;
      const dy = n.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < REPEL_DIST && dist > 0) {
        const force = (REPEL_DIST - dist) / REPEL_DIST * REPEL_FORCE;
        n.vx += (dx / dist) * force;
        n.vy += (dy / dist) * force;
      }

      // Drift back toward base velocity
      n.vx += (n.baseVx - n.vx) * 0.04;
      n.vy += (n.baseVy - n.vy) * 0.04;

      // Cap speed
      const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
      if (speed > MAX_SPEED) { n.vx = (n.vx / speed) * MAX_SPEED; n.vy = (n.vy / speed) * MAX_SPEED; }

      n.x += n.vx; n.y += n.vy; n.phase += 0.014;
      if (n.x < 0 || n.x > canvas.width)  { n.vx *= -1; n.baseVx *= -1; }
      if (n.y < 0 || n.y > canvas.height) { n.vy *= -1; n.baseVy *= -1; }
    }

    // Connections
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < MAX_DIST) {
          const alpha = (1 - d / MAX_DIST) * 0.85;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(28,78,72,${alpha})`;
          ctx.lineWidth = 1.4;
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    // Nodes with soft glow
    for (const n of nodes) {
      const pulse = 0.65 + 0.35 * Math.sin(n.phase);
      const r = n.r * (0.85 + 0.15 * pulse);

      // Glow halo
      const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 5);
      grd.addColorStop(0, `rgba(28,78,72,${0.5 * pulse})`);
      grd.addColorStop(1, 'rgba(28,78,72,0)');
      ctx.beginPath();
      ctx.arc(n.x, n.y, r * 5, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Core dot
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(28,78,72,${0.9 * pulse})`;
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener('resize', resize);
}

// ── Hero cube + slide animation ───────────────────────────────────────────────
const HERO_SLIDES = [
  {
    eyebrow: 'FES Calibration Protocol',
    headline: 'Precision muscle baseline\nin 12 minutes',
    desc: '6 targeted tasks measuring EMG response across your full arm chain — from deltoid to fingertip, 20–50 mA safely calibrated per muscle group.',
    ctaLabel: 'Begin Calibration', ctaView: 'calibration'
  },
  {
    eyebrow: 'Neural Analysis Engine v1.2',
    headline: 'AI that reads your muscles\nin real time',
    desc: 'NAE v1.2 classifies tremor type, detects rigidity, and adjusts FES amplitude per muscle group — within 50 ms of signal change.',
    ctaLabel: 'View AI Insights', ctaView: 'ai'
  },
  {
    eyebrow: '20–50 mA FES · Safety First',
    headline: 'Stimulation calibrated\nto your body',
    desc: 'Every FES pulse is bounded by your personal calibration. If co-contraction is detected mid-session, stimulation halts instantly.',
    ctaLabel: 'Start Live Tracker', ctaView: 'tracker'
  },
  {
    eyebrow: 'Real-Time IMU Tracking',
    headline: 'Movement monitoring\nthat adapts with you',
    desc: 'Inertial measurement at 50 Hz tracks velocity, acceleration, and tremor amplitude — feeding directly into the FES control loop.',
    ctaLabel: 'Open Dashboard', ctaView: 'dashboard'
  }
];

function initHeroCube() {
  const cube = document.getElementById('hero-cube');
  const dots = document.querySelectorAll('.hero-dot');
  const nextBtn = document.getElementById('hero-next');
  const panel = document.getElementById('hero-info-panel');
  const eyebrow = document.getElementById('hero-eyebrow');
  const headline = document.getElementById('hero-headline');
  const desc = document.getElementById('hero-desc');
  const ctaPrimary = document.getElementById('hero-cta-primary');
  const bgSlides = document.querySelectorAll('.hero-bg-slide');

  if (!cube) return;

  let current = 0;
  let autoTimer = null;

  function goToSlide(n) {
    const prev = current;
    current = ((n % 4) + 4) % 4;

    // Rotate cube: show face at index current
    // face-N is positioned at rotateX(N*90deg) translateZ(140px)
    // to bring face-N to front, we counter-rotate by -N*90deg
    cube.style.transform = `rotateX(${-current * 90}deg)`;

    // Background text slides
    bgSlides.forEach((s, i) => s.classList.toggle('active', i === current));

    // Pagination dots
    dots.forEach((d, i) => d.classList.toggle('active', i === current));

    // Fade info panel, swap content, fade back in
    panel.classList.add('fading');
    setTimeout(() => {
      const slide = HERO_SLIDES[current];
      if (eyebrow)  eyebrow.textContent = slide.eyebrow;
      if (headline) headline.innerHTML  = slide.headline.replace('\n', '<br>');
      if (desc)     desc.textContent    = slide.desc;
      if (ctaPrimary) {
        ctaPrimary.textContent = slide.ctaLabel;
        ctaPrimary.onclick = (e) => { e.preventDefault(); navigate(slide.ctaView); };
      }
      panel.classList.remove('fading');
    }, 340);
  }

  function next() { goToSlide(current + 1); }

  function startAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(next, 5000);
  }

  // Wire dots
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => { goToSlide(i); startAuto(); });
  });

  // Wire next arrow
  if (nextBtn) nextBtn.addEventListener('click', () => { next(); startAuto(); });

  // Init first slide
  goToSlide(0);
  startAuto();
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Wire ALL [data-view] elements (nav, hero cols, widget, footer)
  document.querySelectorAll('[data-view]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      navigate(el.dataset.view);
    });
  });

  initBionicArm();
  initIntro();
  initHeroBg();

  // Init modules
  CalibModule.init();
  TrackerModule.init();
  DashModule.init();
  HistoryModule.init();

  // First run check
  if (!Store.patient()) {
    showSetup();
  } else {
    DashModule.refresh();
  }
});
