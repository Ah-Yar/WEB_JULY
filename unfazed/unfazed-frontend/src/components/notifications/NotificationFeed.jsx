import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import api, { apiError } from '../../api/axiosInstance.js';
import Loading from '../common/Loading.jsx';

export default function NotificationFeed({ portalToken }) {
  const [notifications, setNotifications] = useState(null); const [error, setError] = useState(null); const socketRef = useRef(null);
  const isPortal = Boolean(portalToken); const token = portalToken || localStorage.getItem('unfazed_token');
  useEffect(() => {
    if (!token) return undefined;
    const headers = isPortal ? { Authorization: `Bearer ${token}` } : undefined;
    const path = isPortal ? '/client-portal/notifications' : '/notifications';
    api.get(path, { headers }).then(({ data }) => setNotifications(data.notifications)).catch((requestError) => { setNotifications([]); setError(apiError(requestError)); });
    const socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, { path: '/socket.io', auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('notification:new', (notification) => setNotifications((items) => [notification, ...(items || [])]));
    return () => socket.disconnect();
  }, [token, isPortal]);
  const readAll = async () => { const path = isPortal ? '/client-portal/notifications/read-all' : '/notifications/read-all'; try { await api.post(path, {}, { headers: isPortal ? { Authorization: `Bearer ${token}` } : undefined }); setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() }))); } catch (requestError) { setError(apiError(requestError)); } };
  if (!notifications) return <Loading label="Loading notifications"/>;
  return <section className="notification-feed"><div className="notification-feed__head"><div><p className="eyebrow">UPDATES</p><h2>Practice notifications</h2></div>{notifications.some((item) => !item.readAt) && <button className="text-button" onClick={readAll}>Mark all read</button>}</div>{error && <p className="chat-error">{error}</p>}<div className="notification-list">{notifications.length ? notifications.slice(0, 6).map((item) => <article className={item.readAt ? 'notification-item' : 'notification-item is-unread'} key={item._id}><span>●</span><div><b>{item.title}</b><p>{item.body}</p><time>{new Date(item.createdAt).toLocaleString()}</time></div></article>) : <p className="empty-state">No notifications yet.</p>}</div></section>;
}
