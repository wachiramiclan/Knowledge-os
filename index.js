import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const query = (sql, params = []) => pool.query(sql, params).then((r) => r.rows);
const app = express();
app.use(cors());
app.use(express.json());

const route = (fn) => (req, res) =>
  fn(req, res).catch((e) => { console.error(e); res.status(500).json({ error: 'Server error.' }); });

const cleanTags = (t) =>
  (Array.isArray(t) ? t : String(t || '').split(/[,\s]+/))
    .map((x) => x.replace(/^#/, '').trim().toLowerCase()).filter(Boolean).slice(0, 10);

// Short piece of text around the first match, so results show why they matched.
function snippet(body, q) {
  const i = q ? body.toLowerCase().indexOf(q.toLowerCase()) : -1;
  const start = Math.max(0, i - 40);
  return (start > 0 ? '…' : '') + body.slice(start, start + 140) + (body.length > start + 140 ? '…' : '');
}

// Search (or list recent). Full-text search plus exact text match, so error messages are found.
app.get('/api/notes', route(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const rows = await query(
    `SELECT id, title, body, tags, kind, project_id, created_at FROM notes
     WHERE $1 = ''
        OR to_tsvector('english', title || ' ' || body) @@ websearch_to_tsquery('english', $1)
        OR title ILIKE '%' || $1 || '%' OR body ILIKE '%' || $1 || '%' OR $1 = ANY(tags)
     ORDER BY created_at DESC LIMIT 50`, [q]);
  res.json(rows.map((n) => ({ ...n, snippet: snippet(n.body, q) })));
}));

app.post('/api/notes', route(async (req, res) => {
  const { title, body = '', tags, project_id = null } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'A note needs a title.' });
  const rows = await query(
    `INSERT INTO notes (title, body, tags, project_id) VALUES ($1, $2, $3, $4) RETURNING *`,
    [title.trim().slice(0, 120), body, cleanTags(tags), project_id]);
  res.status(201).json(rows[0]);
}));

app.put('/api/notes/:id', route(async (req, res) => {
  const { title, body = '', tags } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'A note needs a title.' });
  const rows = await query(
    `UPDATE notes SET title = $1, body = $2, tags = $3 WHERE id = $4 RETURNING *`,
    [title.trim().slice(0, 120), body, cleanTags(tags), req.params.id]);
  rows[0] ? res.json(rows[0]) : res.status(404).json({ error: 'Not found.' });
}));

app.delete('/api/notes/:id', route(async (req, res) => {
  await query('DELETE FROM notes WHERE id = $1', [req.params.id]);
  res.status(204).end();
}));

// Graph: notes are nodes; two notes are linked when they share a tag.
app.get('/api/graph', route(async (_req, res) => {
  const nodes = await query(`SELECT id, title FROM notes WHERE kind = 'note' ORDER BY id`);
  const edges = await query(
    `SELECT a.id AS a, b.id AS b,
            cardinality(ARRAY(SELECT unnest(a.tags) INTERSECT SELECT unnest(b.tags))) AS shared
     FROM notes a JOIN notes b ON a.id < b.id AND a.tags && b.tags
     WHERE a.kind = 'note' AND b.kind = 'note'`);
  res.json({ nodes, edges });
}));

app.get('/api/projects', route(async (_req, res) => {
  res.json(await query(
    `SELECT p.id, p.name, count(n.id)::int AS notes FROM projects p
     LEFT JOIN notes n ON n.project_id = p.id GROUP BY p.id ORDER BY p.id`));
}));

app.post('/api/projects', route(async (req, res) => {
  if (!req.body.name?.trim()) return res.status(400).json({ error: 'A project needs a name.' });
  const rows = await query('INSERT INTO projects (name) VALUES ($1) RETURNING *', [req.body.name.trim().slice(0, 60)]);
  res.status(201).json(rows[0]);
}));

app.listen(process.env.PORT || 4000, () =>
  console.log(`Server running on http://localhost:${process.env.PORT || 4000}`));
