import { useEffect, useState } from 'react';
import api, { apiError } from '../../api/axiosInstance.js';
import AppShell from '../../components/common/AppShell.jsx';
import Alert from '../../components/common/Alert.jsx';
import Loading from '../../components/common/Loading.jsx';
import ChatWindow from '../../components/chat/ChatWindow.jsx';
import NotificationFeed from '../../components/notifications/NotificationFeed.jsx';

export default function Messages() {
  const [clients, setClients] = useState(null); const [clientId, setClientId] = useState(''); const [notice, setNotice] = useState(null);
  useEffect(() => { api.get('/clients', { params: { limit: 100 } }).then(({ data }) => { setClients(data.clients); if (data.clients[0]) setClientId(data.clients[0]._id); }).catch((error) => { setClients([]); setNotice(apiError(error)); }); }, []);
  return <AppShell title="Messages" eyebrow="THOUGHTFUL, REAL-TIME CONVERSATIONS"><div className="content-wide">{notice && <Alert>{notice}</Alert>}{!clients ? <Loading label="Loading conversations"/> : <div className="messages-layout"><aside className="conversation-list panel"><div className="conversation-list__head"><p className="eyebrow">CLIENT CONVERSATIONS</p><h2>Inbox</h2></div>{clients.length ? clients.map((client) => <button key={client._id} className={clientId === client._id ? 'conversation-item is-selected' : 'conversation-item'} onClick={() => setClientId(client._id)}><span className="avatar avatar--small">{client.firstName?.[0]}{client.lastName?.[0]}</span><span><b>{client.firstName} {client.lastName}</b><small>{client.status}</small></span></button>) : <p className="empty-state">Client conversations will appear here.</p>}</aside><section className="chat-panel panel"><div className="chat-panel__head"><div className="avatar avatar--small">{clients.find((item) => item._id === clientId)?.firstName?.[0]}</div><div><h2>{clients.find((item) => item._id === clientId) ? `${clients.find((item) => item._id === clientId).firstName} ${clients.find((item) => item._id === clientId).lastName}` : 'Conversation'}</h2><p>Messages are stored in your private practice workspace.</p></div></div><ChatWindow clientId={clientId} token={localStorage.getItem('unfazed_token')} viewer="therapist"/></section></div>}<div className="messages-notifications"><NotificationFeed/></div></div></AppShell>;
}
