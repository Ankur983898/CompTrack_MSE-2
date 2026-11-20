import { useEffect, useState, useCallback } from 'react';
import { api } from './api.js';

const STATUSES = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Rejected', 'Reopened', 'Escalated'];
const FLOW = ['Submitted', 'Under Review', 'In Progress', 'Resolved', 'Closed'];
const COLORS = { Assigned: '#6a5acd', Reopened: '#d9822b', Escalated: '#c23b3b', Submitted: '#4a78c9', 'Under Review': '#f2a93b', 'In Progress': '#e0802a', Resolved: '#2fa866', Closed: '#0b7a63', Rejected: '#c23b3b' };
const P = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10', list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', plus: 'M12 5v14M5 12h14',
  bell: 'M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 004 0', out: 'M9 21H5V3h4M16 17l5-5-5-5M21 12H9', menu: 'M3 6h18M3 12h18M3 18h18',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', bolt: 'M13 2L4 14h7l-1 8 9-12h-7z', chart: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5', check: 'M5 12l5 5 9-10', users: 'M16 8a4 4 0 10-8 0 4 4 0 008 0M4 21c0-4 4-6 8-6s8 2 8 6',
  clip: 'M21 12l-9 9a5 5 0 01-7-7l9-9a3 3 0 014 4l-9 9a1 1 0 01-2-2l8-8', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6',
  lock: 'M6 11V8a6 6 0 1112 0v3M5 11h14v10H5z', inbox: 'M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5', clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2', spark: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z', star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
};
const Ic = ({ n, ...p }) => <svg className="ic" viewBox="0 0 24 24" aria-hidden="true" {...p}><path d={P[n]} /></svg>;
const Tag = ({ s }) => <span className={`tag ${s.replace(' ', '-')}`}>{s}</span>;
const dt = (d) => new Date(d + 'Z');
const fmt = (d) => dt(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const ago = (d) => { const m = Math.max(1, Math.round((Date.now() - dt(d)) / 60000)); return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; };
const bus = { fn: () => {} };
const toast = (msg, bad) => bus.fn(msg, bad);
const Logo = () => <div className="logo"><i><Ic n="shield" /></i>Complaint Desk</div>;
const Skel = ({ n = 3 }) => Array.from({ length: n }, (_, i) => <div className="sk" key={i} />);

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const [page, setPage] = useState('landing');
  const [toasts, setToasts] = useState([]);
  useEffect(() => { bus.fn = (m, bad) => { const id = Math.random(); setToasts((t) => [...t, { id, m, bad }]); setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200); }; }, []);
  const login = ({ token, user }) => { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)); setUser(user); toast(`Welcome, ${user.name}!`); };
  const logout = () => { api('/auth/logout', { method: 'POST' }).catch(() => {}); localStorage.clear(); setUser(null); setPage('landing'); };
  return (
    <>
      {!user ? (page === 'landing' ? <Landing go={setPage} /> : <Auth mode={page} go={setPage} onLogin={login} />) : <Shell user={user} logout={logout} />}
      <div className="toasts" role="status">{toasts.map((t) => <div key={t.id} className={`toast ${t.bad ? 'bad' : ''}`}>{t.m}</div>)}</div>
    </>
  );
}

function Landing({ go }) {
  const feats = [['inbox', 'Easy filing', 'Describe the issue, pick a category and priority, attach a photo or PDF. Takes under a minute.'], ['eye', 'Live tracking', 'Follow every complaint through Submitted, Under Review, In Progress and Resolved.'], ['users', 'Smart assignment', 'Admins route each complaint to the right staff member, who is notified instantly.'], ['bell', 'Instant alerts', 'In-app notifications on every status change, so nobody has to chase for updates.'], ['chart', 'Insightful analytics', 'Dashboards show volume by category, resolution speed and satisfaction ratings.'], ['lock', 'Private by design', 'Role-based access, hashed passwords and an anonymous option for sensitive issues.']];
  return (
    <div>
      <div className="land"><div className="wrap">
        <nav className="nav"><Logo /><span className="sp" /><a className="lnk" href="#features">Features</a><a className="lnk" href="#about">About</a>
          <button className="btn ghost" onClick={() => go('login')}>Log in</button></nav>
        <section className="hero">
          <div><h1>Campus problems, <em>solved in the open.</em></h1>
            <p>A transparent complaint management system for colleges. Students report issues, admins assign them, staff resolve them, and everyone can see progress in real time.</p>
            <div className="cta"><button className="btn lg" onClick={() => go('register')}>Get started free <Ic n="bolt" /></button><button className="btn ghost lg" onClick={() => go('login')}>Log in</button></div></div>
          <div className="mock" aria-hidden="true"><div className="row"><div className="k"><b>Open</b>tracked live</div><div className="k"><b>Resolved</b>with ratings</div></div>
            <div className="bar" style={{ width: '88%' }} /><div className="bar" style={{ width: '62%' }} /><div className="bar" style={{ width: '40%' }} />
            <div className="row" style={{ marginTop: '.8rem' }}><span className="tag In-Progress">In Progress</span><span className="tag Resolved">Resolved</span><span className="tag Submitted">Submitted</span></div></div>
        </section></div></div>
      <section className="sec" id="features"><div className="wrap"><h2>Everything a complaint desk needs</h2><p className="sub">Built around the three people involved: the student, the admin and the staff member.</p>
        <div className="g3">{feats.map(([i, t, d]) => <div className="feat" key={t}><div className="ib"><Ic n={i} /></div><h3>{t}</h3><p>{d}</p></div>)}</div></div></section>
      <section className="sec dk"><div className="wrap"><h2>How it works</h2><p className="sub">From problem to resolution in four steps.</p>
        <div className="g4">{['Student files a complaint', 'Admin reviews and assigns staff', 'Staff updates progress with remarks', 'Student rates the fix and it closes'].map((t, i) => <div className="step" key={t}><b>{i + 1}</b><h3>{t}</h3></div>)}</div></div></section>
      <section className="sec" id="about"><div className="wrap"><h2>About this project</h2><p className="sub">A full-stack web application that replaces paper registers and scattered emails with one accountable, trackable system.</p>
        <div className="chips">{['React', 'Vite', 'Node.js', 'Express', 'SQLite', 'JWT auth', 'bcrypt', 'REST API', 'Role-based access'].map((c) => <span className="chip" key={c}>{c}</span>)}</div></div></section>
      <footer className="foot">Complaint Desk · College project · Built with React and Node.js</footer>
    </div>
  );
}

function Auth({ mode, go, onLogin }) {
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const reg = mode === 'register';
  const submit = async (e) => { e.preventDefault(); setErr(''); setBusy(true); try { onLogin(await api(`/auth/${mode}`, { method: 'POST', body: f })); } catch (x) { setErr(x.message); setBusy(false); } };
  return (
    <div className="auth">
      <div className="side"><Logo /><h2>Every complaint heard.<br />Every update visible.</h2><p>Sign in to file, track and resolve campus issues in one place.</p></div>
      <div className="form"><form onSubmit={submit}>
        <h1>{reg ? 'Create your account' : 'Welcome back'}</h1><p className="muted">{reg ? 'Student accounts are free and instant.' : 'Log in to continue.'}</p>
        {reg && <><label htmlFor="n">Full name</label><input id="n" value={f.name} onChange={set('name')} required /></>}
        <label htmlFor="e">College email</label><input id="e" type="email" value={f.email} onChange={set('email')} required />
        <label htmlFor="p">Password</label><input id="p" type="password" value={f.password} onChange={set('password')} minLength={8} required />
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn" style={{ width: '100%', justifyContent: 'center', marginTop: '1.2rem' }} disabled={busy}>{busy ? 'Please wait…' : reg ? 'Create account' : 'Log in'}</button>
        {!reg && <div className="demo"><span className="muted">Demo:</span>{[['Admin', 'admin@college.edu'], ['Staff', 'staff@college.edu']].map(([l, e]) => <button type="button" key={l} onClick={() => setF({ ...f, email: e, password: 'password123' })}>{l}</button>)}</div>}
        <p className="muted" style={{ marginTop: '1.2rem' }}>{reg ? 'Have an account? ' : 'New student? '}<a href="#" onClick={(e) => { e.preventDefault(); go(reg ? 'login' : 'register'); }}>{reg ? 'Log in' : 'Create an account'}</a> · <a href="#" onClick={(e) => { e.preventDefault(); go('landing'); }}>Home</a></p>
      </form></div>
    </div>
  );
}

function Shell({ user, logout }) {
  const [v, setV] = useState({ name: 'dash' }); const [open, setOpen] = useState(false);
  const go = (name, id) => { setV({ name, id }); setOpen(false); window.scrollTo(0, 0); };
  const nav = [['dash', 'home', 'Dashboard'], ['list', 'list', user.role === 'student' ? 'My complaints' : user.role === 'staff' ? 'Assigned to me' : user.role === 'dept_head' ? 'Department complaints' : 'All complaints'], ...(user.role === 'student' ? [['new', 'plus', 'New complaint']] : [])];
  const title = { dash: 'Dashboard', list: 'Complaints', new: 'New complaint', detail: `Complaint #${v.id}` }[v.name];
  return (
    <div className="shell">
      <aside className={`side-nav ${open ? 'open' : ''}`}><Logo />
        {nav.map(([k, i, l]) => <button key={k} className={`nl ${v.name === k ? 'on' : ''}`} onClick={() => go(k)}><Ic n={i} />{l}</button>)}
        <div className="who"><div className="av">{user.name[0]}</div><div style={{ flex: 1, minWidth: 0 }}><b style={{ display: 'block', color: '#fff' }}>{user.name}</b><span className="muted" style={{ textTransform: 'capitalize' }}>{user.role.replace('_', ' ')}</span></div>
          <button className="nl" onClick={logout} title="Log out" aria-label="Log out" style={{ padding: '.5rem' }}><Ic n="out" /></button></div></aside>
      <div className={`ov ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
      <div><header className="top"><button className="ib2 burger" aria-label="Menu" onClick={() => setOpen(true)}><Ic n="menu" /></button><h1>{title}</h1><Bell />
        {user.role === 'student' && <button className="btn hide-sm" onClick={() => go('new')}><Ic n="plus" />New</button>}</header>
        <main className="page" key={v.name + (v.id || '')}>
          {v.name === 'dash' && <Dashboard user={user} go={go} />}{v.name === 'list' && <List user={user} go={go} />}
          {v.name === 'new' && <NewComplaint go={go} />}{v.name === 'detail' && <Detail id={v.id} user={user} back={() => go('list')} />}
        </main></div>
    </div>
  );
}

function Bell() {
  const [items, setItems] = useState([]); const [open, setOpen] = useState(false);
  const load = useCallback(() => api('/notifications').then(setItems).catch(() => {}), []);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);
  const unread = items.filter((n) => !n.is_read).length;
  const toggle = async () => { setOpen(!open); if (!open && unread) { await api('/notifications/read', { method: 'POST' }); setTimeout(load, 2000); } };
  return (<div style={{ position: 'relative' }}><button className="ib2" onClick={toggle} aria-label="Notifications" title="Notifications"><Ic n="bell" />{unread > 0 && <em>{unread}</em>}</button>
    {open && <div className="notes">{items.length === 0 && <p className="muted">You’re all caught up.</p>}{items.map((n) => <p key={n.id} className={n.is_read ? '' : 'new'}>{n.message}<br /><span className="muted">{ago(n.created_at)}</span></p>)}</div>}</div>);
}

function Dashboard({ user, go }) {
  const [rows, setRows] = useState(null); const [st, setSt] = useState(null);
  useEffect(() => { api('/complaints').then(setRows); if (user.role === 'admin') api('/stats').then(setSt); }, [user.role]);
  if (!rows) return <><div className="kpis">{Array.from({ length: 4 }, (_, i) => <div className="sk" key={i} style={{ height: 90 }} />)}</div><Skel /></>;
  const n = (s) => rows.filter((r) => r.status === s).length;
  const done = n('Resolved') + n('Closed'), open = rows.length - done - n('Rejected');
  const byCat = Object.entries(rows.reduce((a, r) => ({ ...a, [r.category]: (a[r.category] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const kpis = [['inbox', 'Total complaints', rows.length, '#e6eefb', '#2f5aa8'], ['clock', 'Open now', open, '#fdf0dc', '#c9741a'], ['check', 'Resolved', done, '#dcf3e5', '#168a4a'],
    user.role === 'admin' ? ['star', 'Avg. rating', st?.avgRating ?? '–', '#fdf0dc', '#c9741a'] : ['bolt', 'High priority', rows.filter((r) => r.priority === 'High' && !['Resolved', 'Closed', 'Rejected'].includes(r.status)).length, '#f9e0e0', '#c23b3b']];
  let off = 0; const C = 2 * Math.PI * 40;
  const rate = rows.length ? Math.round((done / rows.length) * 100) : 0;
  return (<>
    <div className="kpis">{kpis.map(([i, l, v, bg, fg]) => <div className="kpi" key={l}><div className="ib" style={{ background: bg, color: fg }}><Ic n={i} /></div><div><b>{v}</b><span>{l}</span></div></div>)}</div>
    {rows.length > 0 && <div className="insight"><Ic n="spark" /><div><b>{rate}% of complaints are resolved.</b><br /><span style={{ opacity: .8 }}>{byCat[0] && `Most reports are about ${byCat[0][0]} (${byCat[0][1]}).`}{st?.avgResolutionDays != null && ` Average time to resolve: ${st.avgResolutionDays} days.`}</span></div></div>}
    <div className="cols">
      <div className="card"><h3>Status breakdown</h3>{rows.length === 0 ? <div className="empty"><Ic n="chart" /><br />No data yet.</div> :
        <div className="donut"><svg viewBox="0 0 100 100" role="img" aria-label="Status chart"><circle cx="50" cy="50" r="40" fill="none" stroke="#e8efed" strokeWidth="14" />
          {STATUSES.filter(n).map((s) => { const len = (n(s) / rows.length) * C; const el = <circle key={s} cx="50" cy="50" r="40" fill="none" stroke={COLORS[s]} strokeWidth="14" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} />; off += len; return el; })}</svg>
          <div className="leg">{STATUSES.filter(n).map((s) => <span key={s}><i style={{ background: COLORS[s] }} />{s}: <b>{n(s)}</b></span>)}</div></div>}</div>
      <div className="card"><h3>Complaints by category</h3>{byCat.length === 0 ? <div className="empty"><Ic n="chart" /><br />No data yet.</div> : byCat.map(([k, c]) => <div className="hb" key={k}><span>{k}</span><div><i style={{ width: `${(c / byCat[0][1]) * 100}%` }} /></div><b>{c}</b></div>)}</div>
    </div>
    <div className="card"><h3>Recent activity</h3>{rows.length === 0 ? <div className="empty"><Ic n="inbox" /><br />Nothing here yet.{user.role === 'student' && <><br /><button className="btn" style={{ marginTop: '1rem' }} onClick={() => go('new')}>File your first complaint</button></>}</div> :
      [...rows].sort((a, b) => dt(b.updated_at) - dt(a.updated_at)).slice(0, 5).map((r) => <div className="act" key={r.id} onClick={() => go('detail', r.id)}><span className="dot" /><div style={{ flex: 1 }}><b>#{r.id} {r.title}</b><br /><span className="muted">{r.category} · {ago(r.updated_at)}</span></div><Tag s={r.status} /></div>)}</div>
  </>);
}

function List({ user, go }) {
  const [rows, setRows] = useState(null); const [cats, setCats] = useState([]); const [f, setF] = useState({ q: '', status: '', category_id: '' });
  useEffect(() => { api('/categories').then(setCats); }, []);
  useEffect(() => { setRows(null); const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString(); const t = setTimeout(() => api(`/complaints?${qs}`).then(setRows).catch((e) => toast(e.message, 1)), 250); return () => clearTimeout(t); }, [f]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (<>
    <div className="filters"><div className="sbox"><Ic n="search" /><input placeholder="Search by title or description" value={f.q} onChange={set('q')} aria-label="Search" /></div>
      <select value={f.status} onChange={set('status')} aria-label="Status"><option value="">Any status</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
      <select value={f.category_id} onChange={set('category_id')} aria-label="Category"><option value="">Any category</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
    <div className="card" style={{ padding: '.4rem 1rem' }}>{rows === null ? <div style={{ padding: '1rem 0' }}><Skel /></div> : rows.length === 0 ?
      <div className="empty"><Ic n="inbox" /><br />{f.q || f.status || f.category_id ? 'No complaints match these filters.' : user.role === 'student' ? 'You haven’t filed a complaint yet.' : 'Nothing to show yet.'}{user.role === 'student' && !f.q && <><br /><button className="btn" style={{ marginTop: '1rem' }} onClick={() => go('new')}>New complaint</button></>}</div> :
      <table><thead><tr><th>ID</th><th>Title</th><th className="hide-sm">Category</th><th>Priority</th><th>Status</th><th className="hide-sm">Updated</th></tr></thead><tbody>
        {rows.map((c) => <tr key={c.id} className="row" tabIndex={0} onClick={() => go('detail', c.id)} onKeyDown={(e) => e.key === 'Enter' && go('detail', c.id)}><td>#{c.id}</td><td><b>{c.title}</b></td><td className="hide-sm">{c.category}</td><td className={c.priority}>{c.priority}</td><td><Tag s={c.status} /></td><td className="hide-sm muted">{ago(c.updated_at)}</td></tr>)}</tbody></table>}</div></>);
}

function NewComplaint({ go }) {
  const [cats, setCats] = useState([]); const [f, setF] = useState({ title: '', category_id: '', priority: 'Medium', description: '', anonymous: false });
  const [file, setFile] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { api('/categories').then(setCats); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => { e.preventDefault(); setErr(''); setBusy(true); const form = new FormData(); Object.entries(f).forEach(([k, v]) => form.append(k, v)); if (file) form.append('attachment', file);
    try { const r = await api('/complaints', { method: 'POST', form }); toast('Complaint submitted. We’ll keep you posted.'); go('detail', r.id); } catch (x) { setErr(x.message); setBusy(false); } };
  return (<form className="card" onSubmit={submit} style={{ maxWidth: 720 }}><h3>Tell us what went wrong</h3>
    <label htmlFor="t">Title</label><input id="t" value={f.title} onChange={set('title')} maxLength={120} placeholder="e.g. Wi-Fi not working in Block C" required />
    <div className="g2"><div><label htmlFor="c">Category</label><select id="c" value={f.category_id} onChange={set('category_id')} required><option value="">Choose one</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div><label htmlFor="pr" title="High is for urgent or safety issues">Priority</label><select id="pr" value={f.priority} onChange={set('priority')}><option>Low</option><option>Medium</option><option>High</option></select></div></div>
    <label htmlFor="d">Details</label><textarea id="d" rows={5} value={f.description} onChange={set('description')} placeholder="What happened, where and since when?" required />
    <label htmlFor="a">Attachment (photo or PDF, up to 2 MB)</label><input id="a" type="file" accept=".png,.jpg,.jpeg,.pdf" onChange={(e) => setFile(e.target.files[0])} />
    <label style={{ display: 'flex', gap: '.5rem', alignItems: 'center', fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto' }} checked={f.anonymous} onChange={(e) => setF({ ...f, anonymous: e.target.checked })} />Hide my name from staff (admins can still see it)</label>
    {err && <p className="err" role="alert">{err}</p>}<button className="btn" style={{ marginTop: '1.2rem' }} disabled={busy}>{busy ? 'Submitting…' : 'Submit complaint'}</button></form>);
}

function Detail({ id, user, back }) {
  const [c, setC] = useState(null); const [staff, setStaff] = useState([]); const [upd, setUpd] = useState({ status: '', remark: '', assigned_to: '', internal: false, priority: '' });
  const [fb, setFb] = useState({ rating: 5, comments: '' }); const [why, setWhy] = useState(''); const [cats, setCats] = useState([]); const [fixCat, setFixCat] = useState(''); const [err, setErr] = useState('');
  const load = useCallback(() => api(`/complaints/${id}`).then((d) => { setC(d); setUpd({ status: d.status, remark: '', assigned_to: d.assigned_to || '', internal: false, priority: d.priority }); }).catch((x) => setErr(x.message)), [id]);
  useEffect(() => { load(); if (user.role === 'admin' || user.role === 'dept_head') { api('/staff').then(setStaff); api('/categories').then(setCats); } }, [load, user.role]);
  const send = (path, opts, msg) => async (e) => { e.preventDefault(); setErr(''); try { await api(path, opts()); toast(msg); load(); } catch (x) { setErr(x.message); toast(x.message, 1); } };
  if (err && !c) return <><button className="btn ghost" onClick={back}>Back</button><p className="err">{err}</p></>;
  if (!c) return <Skel />;
  const idx = FLOW.indexOf(c.status);
  return (<>
    <button className="btn ghost" onClick={back} style={{ marginBottom: '1rem' }}>← Back to complaints</button>
    <div className="card"><div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', alignItems: 'center' }}><h2 style={{ fontSize: '1.4rem' }}>#{c.id} {c.title}</h2><Tag s={c.status} />{c.overdue ? <span className="tag Rejected">Overdue</span> : null}</div>
      <p className="muted">{c.ticket_no} · <span className={c.priority}>{c.priority} priority</span> · {c.category}{c.department ? ` · ${c.department}` : ''} · Filed by {c.student_name} · {fmt(c.created_at)}</p>
      {c.status === 'Rejected' ? <p className="err">This complaint was rejected. See the history below for the reason.</p> : <div className="stepper">{FLOW.map((s, i) => <div key={s} className={i <= idx ? 'done' : ''}>{s}</div>)}</div>}
      <p style={{ marginTop: '1.2rem' }}>{c.description}</p>
      {c.attachment && <a className="btn ghost" href={`/uploads/${c.attachment}`} target="_blank" rel="noreferrer"><Ic n="clip" />Open attachment</a>}
      <p className="muted" style={{ marginTop: '1rem' }}>Assigned to: <b>{c.staff_name || 'nobody yet'}</b></p></div>
    {(user.role === 'admin' || user.role === 'dept_head') && <div className="card">
      <h3>Change category</h3>
      <div className="filters">
        <select value={fixCat} onChange={(e) => setFixCat(e.target.value)} aria-label="Change category"><option value="">Choose a category…</option>{cats.filter((k) => k.id !== c.category_id).map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</select>
        <button type="button" className="btn ghost sm" disabled={!fixCat} onClick={send(`/complaints/${id}/category`, () => ({ method: 'PATCH', body: { category_id: Number(fixCat) } }), 'Category changed.')}>Change category</button></div>
    </div>}
    {user.role !== 'student' && <form className="card" onSubmit={send(`/complaints/${id}`, () => ({ method: 'PATCH', body: upd }), 'Complaint updated. The student has been notified.')}><h3>Update complaint</h3>
      <div className="g2"><div><label htmlFor="s">Status</label><select id="s" value={upd.status} onChange={(e) => setUpd({ ...upd, status: e.target.value })}>{[c.status, ...(c.allowed || [])].map((s) => <option key={s}>{s}</option>)}</select></div>
        {(user.role === 'admin' || user.role === 'dept_head') && <div><label htmlFor="as">Assign to</label><select id="as" value={upd.assigned_to} onChange={(e) => setUpd({ ...upd, assigned_to: e.target.value })}><option value="">Not assigned</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>}</div>
      {(user.role === 'admin' || user.role === 'dept_head') && <><label htmlFor="pri">Priority</label><select id="pri" value={upd.priority} onChange={(e) => setUpd({ ...upd, priority: e.target.value })}>{['Low', 'Medium', 'High'].map((p) => <option key={p}>{p}</option>)}</select></>}
      <label htmlFor="r">Remark for the student</label><input id="r" value={upd.remark} onChange={(e) => setUpd({ ...upd, remark: e.target.value })} placeholder="What was done? (required for Resolved or Rejected)" />
      <label style={{ display: 'flex', gap: '.5rem', alignItems: 'center', fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto' }} checked={upd.internal} onChange={(e) => setUpd({ ...upd, internal: e.target.checked })} />Internal note (hidden from the student)</label>
      {err && <p className="err" role="alert">{err}</p>}<button className="btn" style={{ marginTop: '1rem' }}>Save changes</button></form>}
    {user.role === 'student' && c.status === 'Resolved' && !c.feedback && <form className="card" onSubmit={send(`/complaints/${id}/feedback`, () => ({ method: 'POST', body: fb }), 'Thanks for your feedback. Complaint closed.')}><h3>Was it resolved to your satisfaction?</h3>
      <div className="stars" role="radiogroup" aria-label="Rating">{[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} className={n <= fb.rating ? 'on' : ''} onClick={() => setFb({ ...fb, rating: n })} aria-label={`${n} stars`}>★</button>)}</div>
      <label htmlFor="cm">Comments (optional)</label><input id="cm" value={fb.comments} onChange={(e) => setFb({ ...fb, comments: e.target.value })} />
      {err && <p className="err" role="alert">{err}</p>}<button className="btn" style={{ marginTop: '1rem' }}>Rate and close</button></form>}
    {user.role === 'student' && (c.allowed || []).includes('Reopened') && <form className="card" onSubmit={send(`/complaints/${id}/reopen`, () => ({ method: 'POST', body: { reason: why } }), 'Complaint reopened.')}><h3>Problem not fixed?</h3>
      <label htmlFor="why">Tell us what is still wrong</label><input id="why" value={why} onChange={(e) => setWhy(e.target.value)} minLength={5} required />
      <button className="btn" style={{ marginTop: '1rem' }}>Reopen complaint</button></form>}
    {c.feedback && <div className="card"><h3>Student feedback</h3><div className="stars">{[1, 2, 3, 4, 5].map((n) => <button key={n} disabled className={n <= c.feedback.rating ? 'on' : ''}>★</button>)}</div>{c.feedback.comments && <p>{c.feedback.comments}</p>}</div>}
    <div className="card"><h3>History</h3><ul className="tl">{c.updates.map((u) => <li key={u.id}><Tag s={u.status} /> {u.remark}<br /><span className="muted">{u.by_name || 'System'} · {fmt(u.created_at)}</span></li>)}</ul></div></>);
}
