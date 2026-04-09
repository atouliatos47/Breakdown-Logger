require('dotenv').config();
const http = require('http');
const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

const PORT = process.env.PORT || 3005;
const PUBLIC = path.join(__dirname, 'public');

// ── Database ──
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ── Create tables ──
pool.query(`
  CREATE TABLE IF NOT EXISTS breakdowns (
    id            SERIAL PRIMARY KEY,
    work_centre   TEXT NOT NULL,
    technician    TEXT NOT NULL,
    start_time    TIMESTAMPTZ NOT NULL,
    end_time      TIMESTAMPTZ NOT NULL,
    duration_mins INTEGER NOT NULL,
    category      TEXT NOT NULL,
    reason        TEXT NOT NULL,
    logged_at     TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS machines (
    id        SERIAL PRIMARY KEY,
    name      TEXT NOT NULL UNIQUE,
    location  TEXT,
    notes     TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS technicians (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    role       TEXT,
    notes      TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS live_downs (
    id          SERIAL PRIMARY KEY,
    work_centre TEXT NOT NULL,
    technician  TEXT NOT NULL,
    started_at  TIMESTAMPTZ DEFAULT NOW(),
    reason      TEXT
  );
  CREATE TABLE IF NOT EXISTS fault_reasons (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS follow_ups (
    id             SERIAL PRIMARY KEY,
    breakdown_id   INTEGER REFERENCES breakdowns(id) ON DELETE CASCADE,
    description    TEXT NOT NULL,
    part           TEXT,
    status         TEXT NOT NULL DEFAULT 'Pending',
    created_at     TIMESTAMPTZ DEFAULT NOW()
  );


`).then(() => {
  console.log('Database ready');
}).catch(err => {
  console.error('Database init error:', err.message);
});

// ── MIME types ──
const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error('Invalid JSON')); }
    });
  });
}

function sendJSON(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ── Router ──
http.createServer(async (req, res) => {
  const { method, url } = req;

  // ── BREAKDOWNS ──
  if (method === 'POST' && url === '/api/breakdowns') {
    try {
      const b = await readBody(req);
      const { wc, tech, start, end, durationMins, category, reason } = b;
      if (!wc || !tech || !start || !end || !durationMins || !category || !reason)
        return sendJSON(res, 400, { error: 'Missing fields' });
      const r = await pool.query(
        `INSERT INTO breakdowns (work_centre,technician,start_time,end_time,duration_mins,category,reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [wc, tech, start, end, durationMins, category, reason]
      );
      return sendJSON(res, 201, r.rows[0]);
    } catch (err) { return sendJSON(res, 500, { error: err.message }); }
  }

  if (method === 'GET' && url === '/api/breakdowns') {
    try {
      const r = await pool.query(`SELECT * FROM breakdowns ORDER BY start_time DESC`);
      return sendJSON(res, 200, r.rows);
    } catch (err) { return sendJSON(res, 500, { error: err.message }); }
  }

  if (method === 'PUT' && url.startsWith('/api/breakdowns/')) {
    try {
      const id = parseInt(url.split('/').pop());
      const b  = await readBody(req);
      const { wc, tech, start, end, durationMins, category, reason } = b;
      const r = await pool.query(
        `UPDATE breakdowns
         SET work_centre=$1, technician=$2, start_time=$3, end_time=$4,
             duration_mins=$5, category=$6, reason=$7
         WHERE id=$8 RETURNING *`,
        [wc, tech, start, end, durationMins, category, reason, id]
      );
      return sendJSON(res, 200, r.rows[0]);
    } catch (err) { return sendJSON(res, 500, { error: err.message }); }
  }

  if (method === 'DELETE' && url.startsWith('/api/breakdowns/')) {
    try {
      const id = parseInt(url.split('/').pop());
      await pool.query('DELETE FROM breakdowns WHERE id=$1', [id]);
      return sendJSON(res, 200, { deleted: id });
    } catch (err) { return sendJSON(res, 500, { error: err.message }); }
  }

  // ── MACHINES ──
  if (method === 'GET' && url === '/api/machines') {
    try {
      const r = await pool.query(`SELECT * FROM machines ORDER BY name`);
      return sendJSON(res, 200, r.rows);
    } catch (err) { return sendJSON(res, 500, { error: err.message }); }
  }

  if (method === 'POST' && url === '/api/machines') {
    try {
      const b = await readBody(req);
      const { name, location, notes } = b;
      if (!name) return sendJSON(res, 400, { error: 'Name required' });
      const r = await pool.query(
        `INSERT INTO machines (name, location, notes) VALUES ($1,$2,$3) RETURNING *`,
        [name.trim(), location || '', notes || '']
      );
      return sendJSON(res, 201, r.rows[0]);
    } catch (err) { return sendJSON(res, 500, { error: err.message }); }
  }

  if (method === 'PUT' && url.startsWith('/api/machines/')) {
    try {
      const id = parseInt(url.split('/').pop());
      const b  = await readBody(req);
      const { name, location, notes } = b;
      const r = await pool.query(
        `UPDATE machines SET name=$1, location=$2, notes=$3 WHERE id=$4 RETURNING *`,
        [name.trim(), location || '', notes || '', id]
      );
      return sendJSON(res, 200, r.rows[0]);
    } catch (err) { return sendJSON(res, 500, { error: err.message }); }
  }

  if (method === 'DELETE' && url.startsWith('/api/machines/')) {
    try {
      const id = parseInt(url.split('/').pop());
      await pool.query('DELETE FROM machines WHERE id=$1', [id]);
      return sendJSON(res, 200, { deleted: id });
    } catch (err) { return sendJSON(res, 500, { error: err.message }); }
  }

  // ── TECHNICIANS ──
  if (method === 'GET' && url === '/api/technicians') {
    try {
      const r = await pool.query(`SELECT * FROM technicians ORDER BY name`);
      return sendJSON(res, 200, r.rows);
    } catch (err) { return sendJSON(res, 500, { error: err.message }); }
  }

  if (method === 'POST' && url === '/api/technicians') {
    try {
      const b = await readBody(req);
      const { name, role, notes } = b;
      if (!name) return sendJSON(res, 400, { error: 'Name required' });
      const r = await pool.query(
        `INSERT INTO technicians (name, role, notes) VALUES ($1,$2,$3) RETURNING *`,
        [name.trim(), role || '', notes || '']
      );
      return sendJSON(res, 201, r.rows[0]);
    } catch (err) { return sendJSON(res, 500, { error: err.message }); }
  }

  if (method === 'PUT' && url.startsWith('/api/technicians/')) {
    try {
      const id = parseInt(url.split('/').pop());
      const b  = await readBody(req);
      const { name, role, notes } = b;
      const r = await pool.query(
        `UPDATE technicians SET name=$1, role=$2, notes=$3 WHERE id=$4 RETURNING *`,
        [name.trim(), role || '', notes || '', id]
      );
      return sendJSON(res, 200, r.rows[0]);
    } catch (err) { return sendJSON(res, 500, { error: err.message }); }
  }

  if (method === 'DELETE' && url.startsWith('/api/technicians/')) {
    try {
      const id = parseInt(url.split('/').pop());
      await pool.query('DELETE FROM technicians WHERE id=$1', [id]);
      return sendJSON(res, 200, { deleted: id });
    } catch (err) { return sendJSON(res, 500, { error: err.message }); }
  }

  // ── LIVE DOWNS ──
  if (method === 'GET' && url === '/api/livedowns') {
    try {
      const r = await pool.query(`SELECT * FROM live_downs ORDER BY started_at DESC`);
      return sendJSON(res, 200, r.rows);
    } catch (err) { return sendJSON(res, 500, { error: err.message }); }
  }

  if (method === 'POST' && url === '/api/livedowns') {
    try {
      const b = await readBody(req);
      const { wc, tech, reason } = b;
      if (!wc || !tech) return sendJSON(res, 400, { error: 'Missing fields' });
      const r = await pool.query(
        `INSERT INTO live_downs (work_centre, technician, reason)
         VALUES ($1,$2,$3) RETURNING *`,
        [wc, tech, reason || '']
      );
      return sendJSON(res, 201, r.rows[0]);
    } catch (err) { return sendJSON(res, 500, { error: err.message }); }
  }

  if (method === 'DELETE' && url.startsWith('/api/livedowns/')) {
    try {
      const id = parseInt(url.split('/').pop());
      const r  = await pool.query(
        `DELETE FROM live_downs WHERE id=$1 RETURNING *`, [id]
      );
      return sendJSON(res, 200, r.rows[0]);
    } catch (err) { return sendJSON(res, 500, { error: err.message }); }
  }

  // ── FAULT REASONS ──
  if (method === 'GET' && url === '/api/reasons') {
    try {
      const r = await pool.query(`SELECT * FROM fault_reasons ORDER BY name`);
      return sendJSON(res, 200, r.rows);
    } catch (err) { return sendJSON(res, 500, { error: err.message }); }
  }

  if (method === 'POST' && url === '/api/reasons') {
    try {
      const b = await readBody(req);
      const { name } = b;
      if (!name) return sendJSON(res, 400, { error: 'Name required' });
      const r = await pool.query(
        `INSERT INTO fault_reasons (name) VALUES ($1) RETURNING *`,
        [name.trim()]
      );
      return sendJSON(res, 201, r.rows[0]);
    } catch (err) { return sendJSON(res, 500, { error: err.message }); }
  }

  if (method === 'PUT' && url.startsWith('/api/reasons/')) {
    try {
      const id = parseInt(url.split('/').pop());
      const b  = await readBody(req);
      const { name } = b;
      const r = await pool.query(
        `UPDATE fault_reasons SET name=$1 WHERE id=$2 RETURNING *`,
        [name.trim(), id]
      );
      return sendJSON(res, 200, r.rows[0]);
    } catch (err) { return sendJSON(res, 500, { error: err.message }); }
  }

  if (method === 'DELETE' && url.startsWith('/api/reasons/')) {
    try {
      const id = parseInt(url.split('/').pop());
      await pool.query('DELETE FROM fault_reasons WHERE id=$1', [id]);
      return sendJSON(res, 200, { deleted: id });
    } catch (err) { return sendJSON(res, 500, { error: err.message }); }
  }

  // ── FOLLOW-UPS ──
  if (method === 'GET' && url === '/api/followups') {
    try {
      const r = await pool.query(
        `SELECT f.*, b.work_centre, b.start_time
         FROM follow_ups f
         JOIN breakdowns b ON b.id = f.breakdown_id
         WHERE f.status != 'Complete'
         ORDER BY f.created_at DESC`
      );
      return sendJSON(res, 200, r.rows);
    } catch (err) { return sendJSON(res, 500, { error: err.message }); }
  }

  if (method === 'GET' && url.startsWith('/api/followups/breakdown/')) {
    try {
      const id = parseInt(url.split('/').pop());
      const r  = await pool.query(
        `SELECT * FROM follow_ups WHERE breakdown_id=$1 AND status != 'Complete' ORDER BY created_at DESC`,
        [id]
      );
      return sendJSON(res, 200, r.rows);
    } catch (err) { return sendJSON(res, 500, { error: err.message }); }
  }

  if (method === 'POST' && url === '/api/followups') {
    try {
      const b = await readBody(req);
      const { breakdownId, description, part } = b;
      if (!breakdownId || !description) return sendJSON(res, 400, { error: 'Missing fields' });
      const r = await pool.query(
        `INSERT INTO follow_ups (breakdown_id, description, part)
         VALUES ($1,$2,$3) RETURNING *`,
        [breakdownId, description, part || '']
      );
      return sendJSON(res, 201, r.rows[0]);
    } catch (err) { return sendJSON(res, 500, { error: err.message }); }
  }

  if (method === 'PUT' && url.startsWith('/api/followups/')) {
    try {
      const id = parseInt(url.split('/').pop());
      const b  = await readBody(req);
      const { status } = b;
      const r = await pool.query(
        `UPDATE follow_ups SET status=$1 WHERE id=$2 RETURNING *`,
        [status, id]
      );
      return sendJSON(res, 200, r.rows[0]);
    } catch (err) { return sendJSON(res, 500, { error: err.message }); }
  }

  if (method === 'DELETE' && url.startsWith('/api/followups/')) {
    try {
      const id = parseInt(url.split('/').pop());
      await pool.query('DELETE FROM follow_ups WHERE id=$1', [id]);
      return sendJSON(res, 200, { deleted: id });
    } catch (err) { return sendJSON(res, 500, { error: err.message }); }
  }

  // ── Static files ──
  const urlPath  = url === '/' ? '/index.html' : url.split('?')[0];
  const filePath = path.join(PUBLIC, urlPath);
  const ext      = path.extname(filePath);
  const mime     = MIME[ext] || 'text/plain';

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });

}).listen(PORT, () => {
  console.log('Breakdown Logger running at http://localhost:' + PORT);
});
