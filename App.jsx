import { useEffect, useState } from 'react';

const api = async (path, method = 'GET', body) => {
  const r = await fetch('/api' + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error('Request failed');
  return r.status === 204 ? null : r.json();
};

const NAV = [
  ['home', 'Home', '⌂'], ['notes', 'Notes', '▤'], ['graph', 'Graph', '⌬'], ['tasks', 'Tasks', '☑'],
  ['projects', 'Projects', '▣'], ['assets', 'Assets', '◫'], ['ai', 'AI Assistant', '✦'],
  ['plugins', 'Plugins', '⧉'], ['settings', 'Settings', '⚙'],
];
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

function Card({ title, icon, className = '', children }) {
  return (
    <section className={'card ' + className}>
      {title && <h3><span className="ico">{icon}</span>{title}</h3>}
      {children}
    </section>
  );
}

function Body({ text }) {
  const lines = text.split('\n').filter(Boolean);
  const bullets = lines.filter((l) => l.startsWith('- '));
  return (
    <>
      {lines.filter((l) => !l.startsWith('- ')).map((l, i) => <p key={i}>{l}</p>)}
      {bullets.length > 0 && <ul>{bullets.map((l, i) => <li key={i}>{l.slice(2)}</li>)}</ul>}
    </>
  );
}

const Tags = ({ tags }) => <div className="tags">{tags.map((t) => <span key={t}>#{t}</span>)}</div>;

function Graph({ graph, onPick, tall }) {
  const { nodes, edges } = graph;
  const W = 700, H = tall ? 520 : 400, cx = W / 2, cy = H / 2;
  const degree = {};
  edges.forEach((e) => { degree[e.a] = (degree[e.a] || 0) + 1; degree[e.b] = (degree[e.b] || 0) + 1; });
  const sorted = [...nodes].sort((a, b) => (degree[b.id] || 0) - (degree[a.id] || 0));
  const hub = sorted[0], rest = sorted.slice(1), pos = {};
  if (hub) pos[hub.id] = [cx, cy];
  rest.forEach((n, i) => {
    const ang = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(1, rest.length);
    pos[n.id] = [cx + Math.cos(ang) * W * 0.34, cy + Math.sin(ang) * H * 0.36];
  });
  if (!hub) return <p className="muted">Add notes with shared tags to see them connect.</p>;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="graph" role="img" aria-label="Graph of connected notes">
      <defs><filter id="glow"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
      {edges.map((e) => pos[e.a] && pos[e.b] && (
        <line key={e.a + '-' + e.b} x1={pos[e.a][0]} y1={pos[e.a][1]} x2={pos[e.b][0]} y2={pos[e.b][1]}
          stroke="#d4a857" strokeOpacity={0.25 + 0.2 * e.shared} />
      ))}
      {nodes.map((n) => {
        const [x, y] = pos[n.id], isHub = n.id === hub.id;
        return (
          <g key={n.id} tabIndex={0} role="button" className="node" onClick={() => onPick(n.id)}
            onKeyDown={(e) => e.key === 'Enter' && onPick(n.id)}>
            {isHub && <circle cx={x} cy={y} r="34" fill="none" stroke="#d4a857" strokeWidth="2" filter="url(#glow)" />}
            <circle cx={x} cy={y} r={isHub ? 7 : 6} fill="#f0c978" filter="url(#glow)" />
            <text x={isHub ? x : x + (x < cx ? -14 : 14)} y={isHub ? y + 54 : y + 4}
              textAnchor={isHub ? 'middle' : x < cx ? 'end' : 'start'}>{n.title}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function App() {
  const [view, setView] = useState('home');
  const [notes, setNotes] = useState([]);
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [projects, setProjects] = useState([]);
  const [sel, setSel] = useState(null);
  const [q, setQ] = useState('');
  const [found, setFound] = useState(null);
  const [ask, setAsk] = useState('');
  const [answer, setAnswer] = useState(null);
  const [cap, setCap] = useState('');
  const [draft, setDraft] = useState(null);
  const [err, setErr] = useState('');

  const refresh = async () => {
    try {
      const [n, g, p] = await Promise.all([api('/notes'), api('/graph'), api('/projects')]);
      setNotes(n); setGraph(g); setProjects(p); setErr('');
    } catch { setErr('Cannot reach the server. Start it with "npm start" in the server folder.'); }
  };
  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    if (!q.trim()) return setFound(null);
    api('/notes?q=' + encodeURIComponent(q)).then(setFound).catch(() => {});
  }, [q]);

  const current = notes.find((n) => n.id === sel) || notes.find((n) => n.kind === 'note');
  const daily = notes.find((n) => n.kind === 'daily');
  const titles = Object.fromEntries(graph.nodes.map((n) => [n.id, n.title]));
  const connections = [...graph.edges].sort((a, b) => b.shared - a.shared).slice(0, 3);
  const maxNotes = Math.max(1, ...projects.map((p) => p.notes));

  const pick = (id) => { setSel(id); const n = notes.find((x) => x.id === id); if (n) setDraft({ ...n, tags: n.tags.join(' ') }); };
  const open = (id) => { pick(id); setView('notes'); };
  const submitAsk = async (e) => {
    e.preventDefault();
    if (!ask.trim()) return setAnswer(null);
    try { setAnswer((await api('/notes?q=' + encodeURIComponent(ask))).slice(0, 4)); } catch { setErr('Search failed.'); }
  };
  const capture = async (e) => {
    e.preventDefault();
    if (!cap.trim()) return;
    await api('/notes', 'POST', { title: cap.trim().split('\n')[0].slice(0, 60), body: cap.trim() });
    setCap(''); refresh();
  };
  const save = async () => {
    if (!draft.title.trim()) return;
    const saved = draft.id ? await api('/notes/' + draft.id, 'PUT', draft) : await api('/notes', 'POST', draft);
    await refresh(); setSel(saved.id); setDraft({ ...saved, tags: saved.tags.join(' ') });
  };
  const remove = async () => { await api('/notes/' + draft.id, 'DELETE'); setDraft(null); setSel(null); refresh(); };
  const newProject = async () => {
    const name = window.prompt('Project name');
    if (name?.trim()) { await api('/projects', 'POST', { name }); refresh(); }
  };

  const nav = (
    <aside className="col">
      <nav className="card nav" aria-label="Main">
        {NAV.map(([id, label, icon]) => (
          <button key={id} className={view === id ? 'on' : ''} aria-current={view === id} onClick={() => setView(id)}>
            <span className="ico">{icon}</span>{label}
          </button>
        ))}
      </nav>
      <div className="card local">
        <div><b><i className="dot" />Local-first</b><p className="muted">All data stays on your device.</p></div>
        <span className="shield" aria-hidden="true">⛨</span>
      </div>
    </aside>
  );

  const graphCard = <Card title="Graph" icon="⌬" className="graphcard"><Graph graph={graph} onPick={open} /></Card>;

  const noteCard = current && (
    <Card title={current.title} icon="▤" className="notecard">
      <Body text={current.body} />
      <Tags tags={current.tags} />
    </Card>
  );

  return (
    <div className="app">
      {view === 'home' && (
        <header className="hero">
          <h1>Your knowledge.<br /><em>Organized. Connected.<br />Yours.</em></h1>
          <p>A local-first knowledge OS built for deep thinking.</p>
        </header>
      )}
      {err && <p className="err" role="alert">{err}</p>}

      <div className={'shell' + (view === 'home' ? ' home' : '')}>
        {nav}

        {view === 'home' && (
          <>
            <div className="col">
              {graphCard}
              <div className="row">
                <Card className="asset" title="Project Brief.pdf" icon="▭">
                  <p className="muted">12 pages · PDF</p>
                  <div className="peak" aria-hidden="true" />
                  <p className="muted small">File storage is coming soon.</p>
                </Card>
                <Card title="Projects" icon="▣" className="projects">
                  <div className="tiles">
                    {projects.map((p) => (
                      <div className="tile" key={p.id}>
                        <b>{p.name}</b><span className="muted">{p.notes} notes</span>
                        <div className="bar"><i style={{ width: (p.notes / maxNotes) * 100 + '%' }} /></div>
                      </div>
                    ))}
                    <button className="tile new" onClick={newProject}>+<span>New Project</span></button>
                  </div>
                </Card>
              </div>
            </div>

            <div className="col">
              {daily && (
                <Card title="Daily Note" icon="▦">
                  <p className="muted small">{fmtDate(daily.created_at)}</p>
                  <Body text={daily.body} />
                  <Tags tags={daily.tags} />
                </Card>
              )}
              {noteCard}
            </div>

            <div className="col">
              <Card title="AI Assistant" icon="✦">
                {answer ? (
                  <>
                    <p>{answer.length ? `I found ${answer.length} result${answer.length > 1 ? 's' : ''}:` : 'I found nothing for that.'}</p>
                    <ul className="results">
                      {answer.map((n) => (
                        <li key={n.id}><button onClick={() => open(n.id)}><b>{n.title}</b><span>{n.snippet}</span></button></li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <p>{connections.length ? `Here are ${connections.length} connections I found for you:` : 'Add tags to your notes and I will find connections.'}</p>
                    <ul className="gold">
                      {connections.map((c) => <li key={c.a + '-' + c.b}>{titles[c.a]} ↔ {titles[c.b]}</li>)}
                    </ul>
                  </>
                )}
                <form className="inbox" onSubmit={submitAsk}>
                  <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Ask anything…" aria-label="Ask anything" />
                  <button aria-label="Search" type="submit">↑</button>
                </form>
              </Card>
              <Card title="Plugins" icon="⧉">
                <div className="plugins">
                  {['◔', '◆', 'M', '⇪', '+'].map((p) => <span key={p} title="Plugins are coming soon">{p}</span>)}
                </div>
              </Card>
              <Card title="Quick Capture" icon="✎">
                <form className="inbox" onSubmit={capture}>
                  <input value={cap} onChange={(e) => setCap(e.target.value)} placeholder="Ideas, links, thoughts…" aria-label="Quick capture" />
                  <button aria-label="Save note" type="submit">↑</button>
                </form>
              </Card>
            </div>
          </>
        )}

        {view === 'graph' && <main className="col"><Card title="Graph" icon="⌬"><Graph graph={graph} onPick={open} tall /></Card></main>}

        {view === 'notes' && (
          <main className="notes">
            <Card>
              <div className="inbox">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes, code and error messages…" aria-label="Search notes" />
              </div>
              <button className="ghost" onClick={() => { setSel(null); setDraft({ title: '', body: '', tags: '', kind: 'note' }); }}>+ New note</button>
              <ul className="list">
                {(found ?? notes).map((n) => (
                  <li key={n.id}><button className={n.id === sel ? 'on' : ''} onClick={() => pick(n.id)}>
                    <b>{n.title}</b><span>{n.snippet || n.body.slice(0, 90)}</span></button></li>
                ))}
              </ul>
            </Card>
            <Card>
              {draft ? (
                <div className="editor">
                  <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" aria-label="Title" />
                  <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} placeholder="Write here. Start a line with “- ” for bullets." aria-label="Body" />
                  <input value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} placeholder="tags separated by spaces" aria-label="Tags" />
                  <div className="actions">
                    <button className="ghost" onClick={save}>Save</button>
                    {draft.id && <button className="ghost danger" onClick={remove}>Delete</button>}
                  </div>
                </div>
              ) : <p className="muted">Pick a note on the left, or start a new one.</p>}
            </Card>
          </main>
        )}

        {!['home', 'graph', 'notes'].includes(view) && (
          <main className="col"><Card title={NAV.find((n) => n[0] === view)[1]} icon="✦"><p className="muted">This section is coming soon.</p></Card></main>
        )}
      </div>
    </div>
  );
}
