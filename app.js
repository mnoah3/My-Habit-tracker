/* 
  Full-stack Habit Tracker app in one file (for demonstration).
  ----------------------------
  Backend: Express.js API
  Frontend: React with Chart.js (uses CDN for simplicity)
  ----------------------------
  To run:
    - Save as app.js
    - `npm install express body-parser cors`
    - `node app.js`
    - Browser: http://localhost:3000
*/

/* ========================
   BACKEND (Node + Express)
   ======================== */
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

let habits = []; // [{id, name, color, history: [{date, done: bool}]}]
let nextHabitId = 1;

// Serve the frontend HTML
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Habit Tracker</title>
      <meta charset="utf-8" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Inter:400,700&display=swap">
      <style>
        body { font-family: Inter, sans-serif; margin: 0; background: #f5f7fa; color: #222; }
        .container { max-width: 860px; margin: 2.5rem auto; background: #fff; border-radius: 8px; box-shadow: 0 1px 8px #ccc; padding: 2rem; }
        h1 { text-align: center; }
        .habits-list { margin: 2rem 0 1rem; }
        .habit-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
        .habit-row:last-child { border-bottom: none;}
        .habit-colors { width: 16px; height: 16px; border-radius: 4px; display: inline-block; margin-right: 7px; }
        .habit-actions { display: flex; gap: 1rem; }
        button { cursor: pointer; }
        .charts { display: flex; flex-wrap: wrap; gap: 2rem; justify-content: center; margin-top: 40px; }
        .chart-item { background: #f8fafc; border-radius: 8px; box-shadow: 0 1px 3px #eee; padding: 1rem; }
      </style>
      <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
      <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head>
    <body>
      <div id="root"></div>
      <script>
        const e = React.createElement;

        // Helper for random color
        function randomColor() {
          const colors = ['#FF9182', '#8BDC92', '#FFDC82', '#7FC0FF', '#B09ADC', '#FFB1D0', '#95E7ED'];
          return colors[Math.floor(Math.random() * colors.length)];
        }

        function formatDate(date) {
          return date.toISOString().slice(0,10);
        }

        function todayStr() {
          return formatDate(new Date());
        }

        function getHabitColor(habit) {
          if (habit.color) return habit.color;
          // assign if not present, for legacy habits
          habit.color = randomColor();
          return habit.color;
        }

        // -------------
        // Main App
        // -------------
        function App() {
          const [habits, setHabits] = React.useState([]);
          const [newHabitName, setNewHabitName] = React.useState('');
          const [loading, setLoading] = React.useState(true);

          React.useEffect(() => {
            fetch('/api/habits')
              .then(r => r.json())
              .then(setHabits)
              .finally(() => setLoading(false));
          }, []);

          // Create a new habit
          function handleAddHabit(e) {
            e.preventDefault();
            if (!newHabitName.trim()) return;
            fetch('/api/habits', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ name: newHabitName, color: randomColor() })
            }).then(r=>r.json()).then(habit => {
              setHabits([...habits, habit]);
              setNewHabitName('');
            });
          }

          function handleToggleHabit(habitId) {
            fetch(\`/api/habits/\${habitId}/toggle_today\`, {
              method: 'PUT'
            }).then(r=>r.json()).then(updated=>{
              setHabits(habits.map(h => h.id===habitId? updated : h));
            });
          }

          function handleDeleteHabit(habitId) {
            if (!window.confirm('Delete this habit?')) return;
            fetch(\`/api/habits/\${habitId}\`, {method: 'DELETE'})
              .then(() => {
                setHabits(habits.filter(h => h.id !== habitId));
              });
          }

          // Compute data for charts
          const chartData = React.useMemo(() => getChartsData(habits), [habits]);

          return e("div", { className: "container" },
            e("h1", null, "🗓️ Habit Tracker"),
            e("form", { onSubmit: handleAddHabit, style: {marginBottom: '1rem', display:'flex', gap: '1rem'}},
              e("input", { 
                  type: "text", placeholder: "New Habit (e.g. Drink Water)",
                  value: newHabitName,
                  onChange: e=>setNewHabitName(e.target.value),
                  style: {flex:1, fontSize:'1.1rem', padding:'8px', borderRadius:'4px', border:'1px solid #ddd'}
                }),
              e("button", { type:"submit", style:{fontSize:'1.1rem', borderRadius:'4px', background:'#7FC0FF', color:'#fff', border:'none', padding:'8px 16px'}}, "Add")
            ),
            e("div", { className: "habits-list" },
              loading ? "Loading..." : (
                habits.map(habit =>
                  e("div", { className:"habit-row", key:habit.id },
                    e("div", null,
                        e("span", {className: "habit-colors", style:{background: getHabitColor(habit)}}),
                        habit.name
                    ),
                    e("div", { className: "habit-actions" },
                      e("label", {},
                        e("input", {
                          type:"checkbox",
                          checked: habit.history && habit.history.some(h => h.date === todayStr() && h.done),
                          onChange: () => handleToggleHabit(habit.id)
                        }),
                        ' Today'
                      ),
                      e("button", {
                        onClick: () => handleDeleteHabit(habit.id),
                        style: { background:'#eee', padding:'0.5rem', border:'none', borderRadius:'4px' }
                      }, "🗑️")
                    )
                  )
                )
              )
            ),
            e("div", {className:"charts"},
              e("div", {className:"chart-item"}, 
                e("h3", null, "Completion Pie"),
                e(PieChart, { habits })
              ),
              e("div", {className:"chart-item"},
                e("h3", null, "Streak Over Time"),
                e(LineChart, { chartData })
              ),
              e("div", {className:"chart-item"},
                e("h3", null, "Weekly Bar"),
                e(BarChart, { chartData })
              )
            )
          );
        }

        // -----------------------------------------------
        // PIE Chart: Distribution of completion per habit
        // -----------------------------------------------
        function PieChart({habits}) {
          const ref = React.useRef();
          React.useEffect(() => {
            if (!habits.length) return;
            let completed = habits.map(h => ({
              name: h.name, 
              completed: (h.history||[]).filter(x=>x.done).length,
              color: getHabitColor(h)
            }))
            let chart = new Chart(ref.current, {
              type: 'pie',
              data: {
                labels: completed.map(h=>h.name),
                datasets: [{data:completed.map(h=>h.completed), backgroundColor: completed.map(h=>h.color)}]
              },
              options: { responsive: true, plugins: { legend: {position:'right'} } }
            });
            return () => chart.destroy();
          }, [habits]);
          return React.createElement('canvas', { ref, width: 220, height: 220 });
        }

        // -----------------------------------------------
        // LINE Chart: Cumulative check-ins per day
        // -----------------------------------------------
        function LineChart({chartData}) {
          const ref = React.useRef();
          React.useEffect(() => {
            if (!chartData.dates.length) return;
            let chart = new Chart(ref.current, {
              type: 'line',
              data: {
                labels: chartData.dates,
                datasets: chartData.lineDatasets
              },
              options: {
                responsive:true,
                scales: { y: { beginAtZero: true }, x: {display:true} },
                plugins: { legend:{position:'top'} }
              }
            });
            return () => chart.destroy();
          }, [chartData]);
          return React.createElement('canvas', { ref, width: 360, height: 220 });
        }

        // ------------------------------------------------
        // BAR Chart: Last 7 days habit check completion
        // ------------------------------------------------
        function BarChart({chartData}) {
          const ref = React.useRef();
          React.useEffect(() => {
            if (!chartData.barLabels.length) return;
            let chart = new Chart(ref.current, {
              type: 'bar',
              data: {
                labels: chartData.barLabels,
                datasets: chartData.barDatasets
              },
              options: {
                responsive:true,
                scales: { y: {beginAtZero:true} },
                plugins: {legend:{position:'top'}}
              }
            });
            return () => chart.destroy();
          }, [chartData]);
          return React.createElement('canvas', { ref, width: 360, height: 220 });
        }

        // -------------
        // CHART DATA AGGREGATION
        // -------------
        function getChartsData(habits) {
          // For the last 14 days
          let dates = [];
          let d = new Date();
          d.setHours(0,0,0,0);
          for (let i=13; i>=0; --i) {
            let dd = new Date(d);
            dd.setDate(dd.getDate()-i);
            dates.push(formatDate(dd));
          }

          // For last 7 days bar chart
          let barLabels = [];
          let b = new Date();
          b.setHours(0,0,0,0);
          for (let i=6; i>=0; --i) {
            let bb = new Date(b);
            bb.setDate(bb.getDate()-i);
            barLabels.push(formatDate(bb));
          }

          // Line datasets per habit
          const lineDatasets = habits.map(habit => {
            let data = dates.map(dt => {
              let h = (habit.history||[]).find(x=>x.date===dt);
              return h?.done ? 1 : 0;
            });
            // Cumulative sum
            for (let i=1;i<data.length;i++) data[i] += data[i-1];
            return {
              label: habit.name,
              data,
              borderColor: getHabitColor(habit),
              fill: false,
              tension: 0.2
            }
          });

          // Bar dataset: For each habit, per day done
          const barDatasets = habits.map(habit => ({
            label: habit.name,
            data: barLabels.map(dt => {
              let h = (habit.history||[]).find(x=>x.date===dt);
              return h?.done ? 1 : 0;
            }),
            backgroundColor: getHabitColor(habit)
          }));

          return { dates, lineDatasets, barLabels, barDatasets };
        }

        // Mount
        ReactDOM.createRoot(document.getElementById('root')).render(e(App));
      </script>
    </body>
    </html>
  `);
});

// API: Get all habits
app.get('/api/habits', (req, res) => {
  res.json(habits);
});

// API: Create a new habit
app.post('/api/habits', (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({error: 'name required'});
  let h = {
    id: nextHabitId++,
    name,
    color: color || '#7FC0FF',
    history: []
  };
  habits.push(h);
  res.status(201).json(h);
});

// API: Toggle today's check for a habit
app.put('/api/habits/:id/toggle_today', (req, res) => {
  const id = parseInt(req.params.id);
  let habit = habits.find(h => h.id === id);
  if (!habit) return res.status(404).json({error: 'not found'});
  let today = (new Date()).toISOString().slice(0,10);
  let rec = habit.history.find(h=>h.date===today);
  if (!rec) {
    habit.history.push({date:today, done:true});
  } else {
    rec.done = !rec.done;
  }
  res.json(habit);
});

// API: Delete a habit
app.delete('/api/habits/:id', (req, res) => {
  const id = parseInt(req.params.id);
  habits = habits.filter(h => h.id !== id);
  res.status(204).end();
});

app.listen(port, () => {
  console.log(\`Habit Tracker app running at http://localhost:\${port}\`);
});