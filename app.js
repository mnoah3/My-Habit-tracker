const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;
const DATA_FILE = path.join(__dirname, 'habits.json');

app.use(cors());
app.use(bodyParser.json());

// ── Load & Save data to file so it persists after restart ──
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      habits = parsed.habits || [];
      nextId = parsed.nextId || 1;
    }
  } catch (e) { habits = []; nextId = 1; }
}

function saveData() {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify({ habits, nextId }), 'utf8'); } catch (e) {}
}

let habits = [];
let nextId = 1;
loadData();

// ── Frontend ──
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Habit Tracker</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@300;400;500&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:          #0b3526;
      --bg2:         #0f4530;
      --card:        rgba(15,69,48,0.55);
      --border:      rgba(201,168,76,0.18);
      --gold:        #c9a84c;
      --gold2:       #e8c96a;
      --beige:       #f2ead8;
      --muted:       rgba(242,234,216,0.45);
      --soft:        rgba(242,234,216,0.68);
      --green:       #2aad78;
      --green2:      #3dbd8a;
      --red:         rgba(255,90,70,0.75);
    }

    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg);
      color: var(--beige);
      min-height: 100vh;
      padding: 0 0 5rem;
    }

    /* ── HEADER ── */
    .top-bar {
      background: rgba(11,53,38,0.95);
      border-bottom: 1px solid var(--border);
      padding: 1.4rem 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(8px);
    }
    .logo {
      font-family: 'Playfair Display', serif;
      font-size: 1.6rem;
      color: var(--beige);
      letter-spacing: -0.01em;
    }
    .logo span { color: var(--gold); }
    .top-date {
      font-size: 0.8rem;
      color: var(--muted);
      letter-spacing: 0.05em;
    }

    .wrap { max-width: 980px; margin: 0 auto; padding: 2rem 1.5rem; }

    /* ── STATS ── */
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
    .stat {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1rem 1.2rem;
      text-align: center;
    }
    .stat-n {
      font-family: 'Playfair Display', serif;
      font-size: 2rem;
      color: var(--gold);
      line-height: 1;
    }
    .stat-l { font-size: 0.68rem; color: var(--muted); margin-top: 4px; letter-spacing: 0.06em; text-transform: uppercase; }

    /* ── ADD FORM ── */
    .add-form {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 2rem;
      background: rgba(15,69,48,0.5);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1rem;
    }
    .add-form input {
      flex: 1;
      background: rgba(11,53,38,0.7);
      border: 1px solid rgba(201,168,76,0.22);
      border-radius: 8px;
      padding: 0.7rem 1rem;
      font-family: 'Inter', sans-serif;
      font-size: 0.93rem;
      color: var(--beige);
      outline: none;
      transition: border-color 0.2s;
    }
    .add-form input::placeholder { color: var(--muted); }
    .add-form input:focus { border-color: var(--gold); }
    .btn-add {
      background: linear-gradient(135deg, var(--gold), var(--gold2));
      color: #0b3526;
      border: none;
      border-radius: 8px;
      padding: 0.7rem 1.4rem;
      font-family: 'Inter', sans-serif;
      font-size: 0.93rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: opacity 0.2s, transform 0.15s;
    }
    .btn-add:hover { opacity: 0.88; transform: translateY(-1px); }

    /* ── SECTION LABEL ── */
    .sec-label {
      font-size: 0.68rem;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--gold);
      opacity: 0.8;
      margin-bottom: 0.75rem;
    }

    /* ── HABITS LIST ── */
    .habits-list {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      overflow: hidden;
      margin-bottom: 2.5rem;
    }
    .habit-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.9rem 1.25rem;
      border-bottom: 1px solid rgba(201,168,76,0.07);
      transition: background 0.18s;
    }
    .habit-row:last-child { border-bottom: none; }
    .habit-row:hover { background: rgba(42,173,120,0.07); }
    .habit-left { display: flex; align-items: center; gap: 0.75rem; }
    .h-dot { width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0; }
    .h-name { font-size: 0.95rem; color: var(--beige); }
    .h-streak { font-size: 0.75rem; color: var(--gold); margin-left: 0.4rem; }
    .habit-right { display: flex; align-items: center; gap: 0.85rem; }

    /* custom checkbox */
    .cb-wrap { display: flex; align-items: center; gap: 0.45rem; cursor: pointer; font-size: 0.82rem; color: var(--soft); user-select: none; }
    .cb-wrap input[type=checkbox] { appearance: none; width: 20px; height: 20px; border: 2px solid rgba(201,168,76,0.35); border-radius: 6px; cursor: pointer; position: relative; transition: all 0.2s; background: transparent; flex-shrink: 0; }
    .cb-wrap input[type=checkbox]:checked { background: linear-gradient(135deg, #2aad78, #1e7a57); border-color: #2aad78; }
    .cb-wrap input[type=checkbox]:checked::after { content: ''; position: absolute; left: 4px; top: 1px; width: 6px; height: 10px; border: 2px solid #fff; border-top: none; border-left: none; transform: rotate(45deg); }

    .btn-del { background: rgba(255,90,70,0.1); border: 1px solid rgba(255,90,70,0.2); color: rgba(255,130,110,0.75); border-radius: 6px; padding: 0.28rem 0.6rem; font-size: 0.78rem; cursor: pointer; transition: all 0.2s; }
    .btn-del:hover { background: rgba(255,90,70,0.22); color: rgba(255,150,130,1); }

    .empty { text-align: center; padding: 2.5rem; color: var(--muted); font-size: 0.9rem; }

    /* ── CHARTS SECTION ── */
    .charts-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.2rem;
    }
    .month-nav { display: flex; align-items: center; gap: 0.65rem; }
    .btn-month {
      background: var(--card);
      border: 1px solid var(--border);
      color: var(--gold2);
      border-radius: 8px;
      padding: 0.32rem 0.8rem;
      font-size: 0.82rem;
      cursor: pointer;
      transition: background 0.2s;
      font-family: 'Inter', sans-serif;
    }
    .btn-month:hover { background: rgba(201,168,76,0.14); }
    .btn-month:disabled { opacity: 0.3; cursor: default; }
    .month-lbl {
      font-family: 'Playfair Display', serif;
      font-size: 1.1rem;
      color: var(--gold2);
      min-width: 155px;
      text-align: center;
    }

    .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; margin-bottom: 1.2rem; }
    .chart-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 1.2rem;
    }
    .chart-card h3 { font-family: 'Playfair Display', serif; font-size: 1rem; color: var(--gold2); margin-bottom: 0.2rem; }
    .chart-sub { font-size: 0.68rem; color: var(--muted); margin-bottom: 0.9rem; line-height: 1.5; }
    .chart-box { position: relative; width: 100%; height: 210px; }
    .chart-box-tall { position: relative; width: 100%; height: 255px; }
    .legend { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .leg-item { display: flex; align-items: center; gap: 5px; font-size: 0.72rem; color: var(--soft); }
    .leg-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }

    @media (max-width: 640px) {
      .stats { grid-template-columns: repeat(2, 1fr); }
      .charts-grid { grid-template-columns: 1fr; }
      .top-bar { flex-direction: column; gap: 0.4rem; text-align: center; }
    }
  </style>
</head>
<body>

<div class="top-bar">
  <div class="logo">Habit <span>Tracker</span></div>
  <div class="top-date" id="top-date"></div>
</div>

<div class="wrap">

  <!-- Stats -->
  <div class="stats">
    <div class="stat"><div class="stat-n" id="s-total">0</div><div class="stat-l">Total Habits</div></div>
    <div class="stat"><div class="stat-n" id="s-today">0</div><div class="stat-l">Done Today</div></div>
    <div class="stat"><div class="stat-n" id="s-month">0</div><div class="stat-l">This Month</div></div>
    <div class="stat"><div class="stat-n" id="s-alltime">0</div><div class="stat-l">All-Time</div></div>
  </div>

  <!-- Add form -->
  <div class="add-form">
    <input type="text" id="habit-input" placeholder="Add a new habit (e.g. Morning Walk, Drink Water...)"/>
    <button class="btn-add" onclick="addHabit()">+ Add Habit</button>
  </div>

  <!-- Habits list -->
  <div class="sec-label">Today's Habits</div>
  <div class="habits-list" id="habits-list">
    <div class="empty">No habits yet. Add your first one above.</div>
  </div>

  <!-- Charts -->
  <div class="charts-header">
    <div class="sec-label" style="margin-bottom:0">Progress Charts</div>
    <div class="month-nav">
      <button class="btn-month" id="btn-prev" onclick="changeMonth(-1)">&#8249; Prev</button>
      <div class="month-lbl" id="month-lbl"></div>
      <button class="btn-month" id="btn-next" onclick="changeMonth(1)">Next &#8250;</button>
    </div>
  </div>

  <div class="charts-grid">
    <!-- Pie -->
    <div class="chart-card">
      <h3>All-time completion</h3>
      <div class="chart-sub">Total check-ins per habit since you started</div>
      <div class="chart-box"><canvas id="pie-chart"></canvas></div>
      <div class="legend" id="pie-legend"></div>
    </div>
    <!-- Bar -->
    <div class="chart-card">
      <h3>Daily completions</h3>
      <div class="chart-sub" id="bar-sub">Gold = all done &nbsp;·&nbsp; Green = partial &nbsp;·&nbsp; Dim = none</div>
      <div class="chart-box"><canvas id="bar-chart"></canvas></div>
    </div>
  </div>

  <!-- Line (full width) -->
  <div class="chart-card">
    <h3>Cumulative streak &mdash; <span id="line-month-lbl"></span></h3>
    <div class="chart-sub">Line climbs each day you tick. Tick a habit now and watch it rise.</div>
    <div class="chart-box-tall"><canvas id="line-chart"></canvas></div>
    <div class="legend" id="line-legend"></div>
  </div>

</div>

<script>
  // ── Palette ──
  const COLORS = ['#2aad78','#c9a84c','#7ec8a0','#e8c96a','#5bb89a','#d4a853','#3db584','#e0a030','#89cff0','#ff9f7f'];
  let colorIdx = 0;
  function nextColor() { return COLORS[colorIdx++ % COLORS.length]; }

  // ── Date helpers ──
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
  }
  function pad(n) { return String(n).padStart(2,'0'); }
  function daysInMonth(year, month) {
    const arr = []; const d = new Date(year, month, 1);
    while (d.getMonth() === month) {
      arr.push(d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()));
      d.setDate(d.getDate()+1);
    }
    return arr;
  }
  function monthLabel(year, month) {
    return new Date(year, month, 1).toLocaleString('default', { month:'long', year:'numeric' });
  }

  // ── State ──
  let habits = [];
  const now = new Date();
  let viewYear = now.getFullYear();
  let viewMonth = now.getMonth();

  // ── Top date ──
  document.getElementById('top-date').textContent = new Date().toLocaleDateString('default', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  // ── API helpers ──
  async function apiFetch(url, opts) {
    const r = await fetch(url, opts);
    if (r.status === 204) return null;
    return r.json();
  }

  async function loadHabits() {
    habits = await apiFetch('/api/habits');
    render();
  }

  async function addHabit() {
    const input = document.getElementById('habit-input');
    const name = input.value.trim();
    if (!name) return;
    const h = await apiFetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color: nextColor() })
    });
    habits.push(h);
    input.value = '';
    render();
  }

  // Allow Enter key to add habit
  document.getElementById('habit-input').addEventListener('keydown', e => { if (e.key === 'Enter') addHabit(); });

  async function toggleHabit(id) {
    const updated = await apiFetch('/api/habits/' + id + '/toggle_today', { method: 'PUT' });
    habits = habits.map(h => h.id === id ? updated : h);
    render();
  }

  async function deleteHabit(id) {
    if (!confirm('Delete this habit?')) return;
    await apiFetch('/api/habits/' + id, { method: 'DELETE' });
    habits = habits.filter(h => h.id !== id);
    render();
  }

  // ── Month nav ──
  function changeMonth(dir) {
    viewMonth += dir;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    const n = new Date();
    const atCurrent = viewYear === n.getFullYear() && viewMonth === n.getMonth();
    const atFuture = viewYear > n.getFullYear() || (viewYear === n.getFullYear() && viewMonth > n.getMonth());
    if (atFuture) { viewMonth -= dir; if (viewMonth < 0) { viewMonth = 11; viewYear--; } if (viewMonth > 11) { viewMonth = 0; viewYear++; } return; }
    document.getElementById('btn-next').disabled = atCurrent;
    renderCharts();
    updateMonthLabels();
  }

  function updateMonthLabels() {
    const lbl = monthLabel(viewYear, viewMonth);
    document.getElementById('month-lbl').textContent = lbl;
    document.getElementById('line-month-lbl').textContent = lbl;
    const n = new Date();
    document.getElementById('btn-next').disabled = viewYear === n.getFullYear() && viewMonth === n.getMonth();
  }

  // ── Streak calculator ──
  function calcStreak(habit) {
    let streak = 0;
    const d = new Date();
    while (true) {
      const ds = d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
      const rec = (habit.history||[]).find(x => x.date === ds);
      if (rec && rec.done) { streak++; d.setDate(d.getDate()-1); }
      else break;
    }
    return streak;
  }

  // ── Render habits list ──
  function renderHabits() {
    const container = document.getElementById('habits-list');
    const today = todayStr();
    if (!habits.length) {
      container.innerHTML = '<div class="empty">No habits yet. Add your first one above.</div>';
      return;
    }
    container.innerHTML = habits.map(h => {
      const done = (h.history||[]).some(x => x.date === today && x.done);
      const streak = calcStreak(h);
      const streakBadge = streak > 0 ? '<span class="h-streak">&#x1F525; ' + streak + 'd streak</span>' : '';
      return '<div class="habit-row">' +
        '<div class="habit-left">' +
          '<span class="h-dot" style="background:' + h.color + '"></span>' +
          '<span class="h-name">' + escHtml(h.name) + '</span>' +
          streakBadge +
        '</div>' +
        '<div class="habit-right">' +
          '<label class="cb-wrap">' +
            '<input type="checkbox"' + (done ? ' checked' : '') + ' onchange="toggleHabit(' + h.id + ')" />' +
            'Done today' +
          '</label>' +
          '<button class="btn-del" onclick="deleteHabit(' + h.id + ')">&#x2715;</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  // ── Render stats ──
  function renderStats() {
    const today = todayStr();
    const days = daysInMonth(viewYear, viewMonth);
    document.getElementById('s-total').textContent = habits.length;
    document.getElementById('s-today').textContent = habits.filter(h => (h.history||[]).some(x => x.date===today && x.done)).length;
    document.getElementById('s-month').textContent = habits.reduce((s,h)=>s+(h.history||[]).filter(x=>x.done&&days.includes(x.date)).length, 0);
    document.getElementById('s-alltime').textContent = habits.reduce((s,h)=>s+(h.history||[]).filter(x=>x.done).length, 0);
  }

  // ── Chart instances ──
  const chartObjs = {};
  function destroyChart(id) { if (chartObjs[id]) { chartObjs[id].destroy(); delete chartObjs[id]; } }

  const TT_OPTS = { backgroundColor:'#0b3526', titleColor:'#e8c96a', bodyColor:'#f2ead8', borderColor:'rgba(201,168,76,0.3)', borderWidth:1 };
  const GRID = { color:'rgba(201,168,76,0.07)' };
  const TICK = { color:'rgba(242,234,216,0.45)', font:{ size:11 } };

  // Pie/Doughnut
  function renderPie() {
    destroyChart('pie');
    const canvas = document.getElementById('pie-chart');
    if (!habits.length) return;
    const data = habits.map(h => ({ name:h.name, done:(h.history||[]).filter(x=>x.done).length, color:h.color }));
    const total = data.reduce((s,d)=>s+d.done, 0);
    chartObjs['pie'] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: data.map(d=>d.name),
        datasets: [{ data:data.map(d=>d.done||0), backgroundColor:data.map(d=>d.color), borderColor:'#0b3526', borderWidth:3, hoverOffset:6 }]
      },
      options: {
        responsive:true, maintainAspectRatio:false, cutout:'60%',
        plugins: {
          legend:{ display:false },
          tooltip:{ ...TT_OPTS, callbacks:{ label: ctx => { const pct = total>0?Math.round(ctx.parsed/total*100):0; return ' '+ctx.parsed+' check-ins ('+pct+'%)'; } } }
        }
      }
    });
    // legend
    document.getElementById('pie-legend').innerHTML = habits.map(h =>
      '<div class="leg-item"><span class="leg-dot" style="background:'+h.color+'"></span>'+escHtml(h.name)+' — '+((h.history||[]).filter(x=>x.done).length)+' days</div>'
    ).join('');
  }

  // Bar
  function renderBar() {
    destroyChart('bar');
    const canvas = document.getElementById('bar-chart');
    const days = daysInMonth(viewYear, viewMonth);
    const n = new Date();
    const isCurrent = viewYear===n.getFullYear() && viewMonth===n.getMonth();
    const active = isCurrent ? days.filter(d=>d<=todayStr()) : days;
    if (!active.length) return;
    const total = habits.length;
    const counts = active.map(day => habits.reduce((s,h)=>s+((h.history||[]).find(x=>x.date===day&&x.done)?1:0), 0));
    const bg = counts.map(c => c===0?'rgba(242,234,216,0.07)': c===total&&total>0?'#c9a84c':'#2aad78');
    const bd = counts.map(c => c===0?'transparent': c===total&&total>0?'#e8c96a':'#3dbd8a');
    chartObjs['bar'] = new Chart(canvas, {
      type:'bar',
      data:{
        labels: active.map(d=>parseInt(d.slice(8))),
        datasets:[{ data:counts, backgroundColor:bg, borderColor:bd, borderWidth:1, borderRadius:4, borderSkipped:false }]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        scales:{
          x:{ grid:GRID, ticks:{ ...TICK, maxTicksLimit:16, autoSkip:true }, title:{ display:true, text:'Day of month', color:'rgba(242,234,216,0.28)', font:{size:10} } },
          y:{ beginAtZero:true, max:Math.max(total,1), grid:GRID, ticks:{ ...TICK, stepSize:1 }, title:{ display:true, text:'Habits done', color:'rgba(242,234,216,0.28)', font:{size:10} } }
        },
        plugins:{
          legend:{display:false},
          tooltip:{ ...TT_OPTS, callbacks:{ title:i=>'Day '+i[0].label, label:ctx=>' '+ctx.parsed.y+' of '+total+' habits done' } }
        }
      }
    });
  }

  // Line
  function renderLine() {
    destroyChart('line');
    const canvas = document.getElementById('line-chart');
    const days = daysInMonth(viewYear, viewMonth);
    const n = new Date();
    const isCurrent = viewYear===n.getFullYear() && viewMonth===n.getMonth();
    const active = isCurrent ? days.filter(d=>d<=todayStr()) : days;
    if (!active.length || !habits.length) return;
    const datasets = habits.map(h => {
      let cum = 0;
      const data = active.map(day => {
        const rec = (h.history||[]).find(x=>x.date===day);
        if (rec&&rec.done) cum++;
        return cum;
      });
      return {
        label:h.name, data,
        borderColor:h.color,
        backgroundColor:h.color+'14',
        fill:true, tension:0.38,
        pointRadius: active.map((_,i)=>i===active.length-1?5:2),
        pointBackgroundColor:h.color,
        borderWidth:2
      };
    });
    chartObjs['line'] = new Chart(canvas, {
      type:'line',
      data:{ labels:active.map(d=>parseInt(d.slice(8))), datasets },
      options:{
        responsive:true, maintainAspectRatio:false,
        interaction:{ mode:'index', intersect:false },
        scales:{
          x:{ grid:GRID, ticks:{ ...TICK, maxTicksLimit:16, autoSkip:true }, title:{ display:true, text:'Day of month', color:'rgba(242,234,216,0.28)', font:{size:10} } },
          y:{ beginAtZero:true, grid:GRID, ticks:{ ...TICK, stepSize:1 }, title:{ display:true, text:'Cumulative check-ins', color:'rgba(242,234,216,0.28)', font:{size:10} } }
        },
        plugins:{
          legend:{display:false},
          tooltip:{ ...TT_OPTS, callbacks:{ title:i=>'Day '+i[0].label } }
        }
      }
    });
    document.getElementById('line-legend').innerHTML = habits.map(h=>
      '<div class="leg-item"><span class="leg-dot" style="background:'+h.color+'"></span>'+escHtml(h.name)+'</div>'
    ).join('');
  }

  function renderCharts() { renderPie(); renderBar(); renderLine(); }

  function render() { renderStats(); renderHabits(); renderCharts(); }

  // ── Boot ──
  updateMonthLabels();
  loadHabits();
</script>
</body>
</html>`);
});

// ── API ──
app.get('/api/habits', (req, res) => res.json(habits));

app.post('/api/habits', (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const h = { id: nextId++, name, color: color || '#2aad78', history: [] };
  habits.push(h);
  saveData();
  res.status(201).json(h);
});

app.put('/api/habits/:id/toggle_today', (req, res) => {
  const id = parseInt(req.params.id);
  const habit = habits.find(h => h.id === id);
  if (!habit) return res.status(404).json({ error: 'not found' });
  const today = new Date().toISOString().slice(0, 10);
  const rec = habit.history.find(r => r.date === today);
  if (!rec) habit.history.push({ date: today, done: true });
  else rec.done = !rec.done;
  saveData();
  res.json(habit);
});

app.delete('/api/habits/:id', (req, res) => {
  const id = parseInt(req.params.id);
  habits = habits.filter(h => h.id !== id);
  saveData();
  res.status(204).end();
});

app.listen(port, () => console.log('Habit Tracker running at http://localhost:' + port));
