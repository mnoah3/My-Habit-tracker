// netlify/functions/habits.js
// Handles all /api/habits requests as a Netlify serverless function
// Data is stored in memory (resets on cold start — for persistent storage upgrade to a DB)

let habits = [];
let nextId = 1;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function respond(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  const method = event.httpMethod;
  const path = event.path.replace('/.netlify/functions/habits', '').replace('/api/habits', '');

  // CORS preflight
  if (method === 'OPTIONS') return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' }, body: '' };

  // GET /api/habits
  if (method === 'GET' && (path === '' || path === '/')) {
    return respond(200, habits);
  }

  // POST /api/habits
  if (method === 'POST' && (path === '' || path === '/')) {
    const body = JSON.parse(event.body || '{}');
    if (!body.name) return respond(400, { error: 'name required' });
    const h = { id: nextId++, name: body.name, color: body.color || '#2aad78', history: [] };
    habits.push(h);
    return respond(201, h);
  }

  // PUT /api/habits/:id/toggle_today
  const toggleMatch = path.match(/^\/(\d+)\/toggle_today$/);
  if (method === 'PUT' && toggleMatch) {
    const id = parseInt(toggleMatch[1]);
    const habit = habits.find(h => h.id === id);
    if (!habit) return respond(404, { error: 'not found' });
    const today = todayStr();
    const rec = habit.history.find(r => r.date === today);
    if (!rec) habit.history.push({ date: today, done: true });
    else rec.done = !rec.done;
    return respond(200, habit);
  }

  // DELETE /api/habits/:id
  const deleteMatch = path.match(/^\/(\d+)$/);
  if (method === 'DELETE' && deleteMatch) {
    const id = parseInt(deleteMatch[1]);
    habits = habits.filter(h => h.id !== id);
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' };
  }

  return respond(404, { error: 'not found' });
};
