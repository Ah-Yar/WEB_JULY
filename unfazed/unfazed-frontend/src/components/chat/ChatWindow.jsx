import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import api, { apiError } from '../../api/axiosInstance.js';
import Loading from '../common/Loading.jsx';

const displayTime = (timestamp) => new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export default function ChatWindow({ clientId, token, viewer = 'therapist' }) {
  const [messages, setMessages] = useState(null); const [value, setValue] = useState(''); const [typing, setTyping] = useState(false); const [error, setError] = useState(null); const socketRef = useRef(null); const typingTimer = useRef(null); const endRef = useRef(null);
  const isPortal = viewer === 'client';

  useEffect(() => {
    if (!clientId || !token) return undefined;
    let active = true;
    setMessages(null); setError(null);
    const headers = isPortal ? { Authorization: `Bearer ${token}` } : undefined;
    const historyPath = isPortal ? '/client-portal/messages' : `/chats/${clientId}/messages`;
    api.get(historyPath, { headers }).then(({ data }) => { if (active) setMessages(data.messages); }).catch((requestError) => { if (active) { setMessages([]); setError(apiError(requestError)); } });

    const socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, { path: '/socket.io', auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => { socket.emit('conversation:join', { clientId }, (reply) => { if (!reply?.ok) setError(reply?.error || 'Unable to open this conversation.'); else socket.emit('message:read', { clientId }); }); });
    socket.on('message:new', (message) => { setMessages((items) => items?.some((item) => item._id === message._id) ? items : [...(items || []), message]); if (message.senderType !== viewer) socket.emit('message:read', { clientId }); });
    socket.on('typing:update', ({ senderType, isTyping }) => { if (senderType !== viewer) setTyping(isTyping); });
    socket.on('message:read', ({ by, at }) => { if (by !== viewer) setMessages((items) => (items || []).map((item) => item.senderType === viewer ? { ...item, readAt: at } : item)); });
    socket.on('connect_error', () => setError('Live chat could not connect. Refresh to try again.'));
    return () => { active = false; clearTimeout(typingTimer.current); socket.disconnect(); };
  }, [clientId, token, isPortal, viewer]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);
  const updateValue = (event) => { const next = event.target.value; setValue(next); const socket = socketRef.current; if (!socket?.connected) return; socket.emit('typing:update', { clientId, isTyping: Boolean(next.trim()) }); clearTimeout(typingTimer.current); typingTimer.current = setTimeout(() => socket.emit('typing:update', { clientId, isTyping: false }), 900); };
  const send = (event) => { event.preventDefault(); const content = value.trim(); if (!content || !socketRef.current) return; setError(null); socketRef.current.emit('message:send', { clientId, content }, (reply) => { if (!reply?.ok) setError(reply?.error || 'Message could not be sent.'); }); setValue(''); socketRef.current.emit('typing:update', { clientId, isTyping: false }); };
  if (!clientId) return <div className="chat-empty">Choose a client to open a conversation.</div>;
  if (!messages) return <div className="chat-loading"><Loading label="Opening conversation" /></div>;
  return <section className="chat-window"><div className="chat-window__messages">{messages.length ? messages.map((message) => <div key={message._id} className={`message-bubble ${message.senderType === viewer ? 'message-bubble--mine' : ''}`}><p>{message.content}</p><span>{displayTime(message.createdAt)} {message.senderType === viewer && <i>{message.readAt ? 'Read' : 'Sent'}</i>}</span></div>) : <div className="chat-empty"><span>⌁</span><p>Start with a thoughtful hello.</p></div>}{typing && <div className="typing-indicator"><i/><i/><i/> Typing…</div>}<div ref={endRef}/></div>{error && <p className="chat-error">{error}</p>}<form className="chat-window__form" onSubmit={send}><textarea value={value} onChange={updateValue} rows="2" placeholder="Write a message…" maxLength="4000"/><button className="button button--primary" disabled={!value.trim()}>Send <span>↑</span></button></form></section>;
}
