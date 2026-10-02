import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosInstance.js';
import AppShell from '../../components/common/AppShell.jsx';
import Loading from '../../components/common/Loading.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const prettyDate = (date) => new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const prettyTime = (date) => new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export default function Dashboard() {
  const { therapist } = useAuth(); const [data, setData] = useState(null);
  useEffect(() => { Promise.all([api.get('/clients', { params: { limit: 100 } }), api.get('/sessions', { params: { from: new Date().toISOString() } })]).then(([clients, sessions]) => setData({ clients: clients.data.clients, sessions: sessions.data.sessions })).catch(() => setData({ clients: [], sessions: [] })); }, []);
  if (!data) return <AppShell title={`Good to see you, ${therapist?.name?.split(' ')[0] || ''}`}><Loading label="Opening your practice" /></AppShell>;
  const nextSessions = data.sessions.filter((item) => item.status === 'scheduled').slice(0, 4); const active = data.clients.filter((item) => item.status === 'active').length;
  return <AppShell title={`Good to see you, ${therapist?.name?.split(' ')[0] || ''}`} eyebrow="TODAY AT A GLANCE" action={<Link className="button button--primary button--small" to="/app/clients">Add client <span>+</span></Link>}><section className="stat-grid"><article className="stat-card"><span>ACTIVE CLIENTS</span><b>{active}</b><p>{data.clients.length ? 'Across your practice' : 'Your first client will appear here'}</p></article><article className="stat-card"><span>UPCOMING SESSIONS</span><b>{nextSessions.length}</b><p>Scheduled from today</p></article><article className="stat-card stat-card--link"><span>YOUR BRANDED LINK</span><b>/{therapist?.slug}</b><a href={`/${therapist?.slug}`} target="_blank" rel="noreferrer">Open public page ↗</a></article></section>
    <section className="dashboard-grid"><article className="panel panel--sessions"><div className="panel-heading"><div><p className="eyebrow">UP NEXT</p><h2>Upcoming sessions</h2></div><Link to="/app/schedule">View schedule →</Link></div>{nextSessions.length ? <div className="session-list">{nextSessions.map((session) => <div className="session-row" key={session._id}><time><b>{prettyDate(session.startsAt)}</b><span>{prettyTime(session.startsAt)}</span></time><div className="avatar avatar--small">{session.client?.firstName?.slice(0, 1)}</div><span className="session-client"><b>{session.client?.firstName} {session.client?.lastName}</b><small>{session.durationMinutes} min session</small></span><span className="status status--scheduled">Confirmed</span></div>)}</div> : <div className="blank-state"><span>◷</span><h3>Your calendar is clear.</h3><p>Set availability so clients can start booking a time with you.</p><Link className="text-button" to="/app/availability">Set availability →</Link></div>}</article>
      <article className="panel panel--start"><p className="eyebrow">SET UP YOUR SPACE</p><h2>Ready for clients?</h2><p>Complete these essentials to make your public link feel like home.</p><ul><li><Link to="/app/profile">Shape your profile <span>→</span></Link></li><li><Link to="/app/availability">Set your availability <span>→</span></Link></li><li><a href={`/${therapist?.slug}`} target="_blank" rel="noreferrer">Review your public page <span>↗</span></a></li></ul></article></section>
  </AppShell>;
}
