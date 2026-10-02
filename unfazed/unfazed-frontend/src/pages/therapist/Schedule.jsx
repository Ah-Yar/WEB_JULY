import { useEffect, useState } from 'react';
import api, { apiError } from '../../api/axiosInstance.js';
import AppShell from '../../components/common/AppShell.jsx';
import Alert from '../../components/common/Alert.jsx';
import Loading from '../../components/common/Loading.jsx';

const formatDate = (date) => new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
const formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export default function Schedule() {
  const [sessions, setSessions] = useState(null); const [notice, setNotice] = useState(null);
  const load = () => api.get('/sessions', { params: { from: new Date().toISOString() } }).then(({ data }) => setSessions(data.sessions)).catch((error) => { setSessions([]); setNotice({ type: 'error', text: apiError(error) }); });
  useEffect(() => { load(); }, []);
  const changeStatus = async (id, status) => { try { await api.patch(`/sessions/${id}/status`, { status }); load(); } catch (error) { setNotice({ type: 'error', text: apiError(error) }); } };
  return <AppShell title="Schedule" eyebrow="YOUR FORWARD CALENDAR">{notice && <Alert type={notice.type}>{notice.text}</Alert>}{!sessions ? <Loading label="Loading sessions"/> : <section className="schedule-list">{sessions.length ? sessions.map((session) => <article className="schedule-card" key={session._id}><time><span>{formatDate(session.startsAt)}</span><b>{formatTime(session.startsAt)}</b></time><div className="avatar">{session.client?.firstName?.[0]}{session.client?.lastName?.[0]}</div><div className="schedule-client"><h2>{session.client?.firstName} {session.client?.lastName}</h2><p>{session.client?.email} · {session.durationMinutes} min · Booked via {session.bookingSource}</p></div><select aria-label="Update session status" value={session.status} onChange={(event) => changeStatus(session._id, event.target.value)}><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="no_show">No show</option></select></article>) : <section className="panel blank-state"><span>◷</span><h3>No upcoming sessions yet.</h3><p>Once a client books from your public page, their session will appear here.</p></section>}</section>}</AppShell>;
}
