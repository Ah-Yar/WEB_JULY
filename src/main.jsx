import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const seedTasks = [
  { id: 1, title: 'Review project brief', done: true, priority: 'High', due: 'Today' },
  { id: 2, title: 'Sketch the dashboard layout', done: false, priority: 'Medium', due: 'Today' },
  { id: 3, title: 'Set up local storage', done: false, priority: 'Low', due: 'Tomorrow' },
  { id: 4, title: 'Polish responsive styles', done: false, priority: 'Medium', due: 'Fri, Oct 4' },
];

const seedNotes = [
  { id: 1, title: 'Project direction', body: 'Keep the experience calm and focused. Make the essentials easy to find, and let the interface breathe.', tag: 'Ideas', updatedAt: new Date().toISOString(), color: 'yellow' },
  { id: 2, title: 'React concepts to demonstrate', body: 'Functional components, props, state, effects, event handling, conditional rendering, and reusable UI patterns.', tag: 'Learning', updatedAt: new Date(Date.now() - 86400000).toISOString(), color: 'purple' },
  { id: 3, title: 'Launch checklist', body: 'Test mobile layout, verify local storage, add README, and publish the repository link before the deadline.', tag: 'Planning', updatedAt: new Date(Date.now() - 172800000).toISOString(), color: 'blue' },
];

const noteColors = ['yellow', 'purple', 'blue', 'green'];
const Icon = ({ children }) => <span className="icon">{children}</span>;

function formatTimestamp(value) {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  if (seconds < 172800) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
}

function Sidebar({ view, setView, taskCount, noteCount }) {
  return <aside>
    <div className="brand"><div className="brandmark">✦</div><div><strong>focusboard</strong><small>your calm workspace</small></div></div>
    <nav>
      <button className={view === 'tasks' ? 'active' : ''} onClick={() => setView('tasks')}><Icon>✓</Icon>Tasks <b>{taskCount}</b></button>
      <button className={view === 'notes' ? 'active' : ''} onClick={() => setView('notes')}><Icon>▤</Icon>Notes <b>{noteCount}</b></button>
    </nav>
    <div className="sideBottom">
      <div className="tip"><span>✺</span><div><strong>Small steps, big progress.</strong><p>Keep your day moving one task at a time.</p></div></div>
      <div className="profile"><div className="avatar">AY</div><div><strong>Ah Yar</strong><small>Personal workspace</small></div><span className="dots">•••</span></div>
    </div>
  </aside>;
}

function AppHeader({ view, onAdd }) {
  const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return <header>
    <div><p className="eyebrow">{dateLabel}</p><h1>{view === 'tasks' ? `${greeting}, Ah Yar.` : 'Your thoughts, organized.'}</h1><p className="sub">{view === 'tasks' ? 'Let’s make today count. You’re doing great.' : 'Capture ideas, plans, and everything in between.'}</p></div>
    <div className="headerActions"><button className="circle" aria-label="Theme">☼</button><button className="circle" aria-label="Help">?</button><button className="add" onClick={onAdd}>＋ <span>{view === 'tasks' ? 'New task' : 'New note'}</span></button></div>
  </header>;
}

function TaskItem({ task, onToggle, onEdit, onDelete }) {
  return <div className={`task ${task.done ? 'completed' : ''}`}>
    <button className="check" aria-label={task.done ? 'Mark pending' : 'Mark completed'} onClick={() => onToggle(task.id)}>{task.done ? '✓' : ''}</button>
    <div className="taskContent"><strong>{task.title}</strong><div><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span><span className="due">◷ {task.due}</span></div></div>
    <div className="itemActions"><button onClick={() => onEdit(task)} aria-label="Edit task">✎</button><button className="deleteBtn" onClick={() => onDelete(task.id)} aria-label="Delete task">×</button></div>
  </div>;
}

function TaskDashboard({ tasks, setTasks, filter, setFilter, onEdit, onAdd }) {
  const completed = tasks.filter(task => task.done).length;
  const visibleTasks = useMemo(() => tasks.filter(task => filter === 'All' || (filter === 'Completed' ? task.done : !task.done)), [tasks, filter]);
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const toggleTask = id => setTasks(items => items.map(item => item.id === id ? { ...item, done: !item.done } : item));
  const deleteTask = id => setTasks(items => items.filter(item => item.id !== id));

  return <>
    <section className="stats">
      <div className="stat mainstat"><div className="ring" style={{ background: `conic-gradient(var(--purple) 0 ${progress}%, #dfdcff ${progress}% 100%)` }}><span>{completed}<small>/ {tasks.length}</small></span></div><div><small>DAILY PROGRESS</small><h2>{tasks.length > 0 && completed === tasks.length ? 'All clear!' : completed ? 'Nice momentum' : 'Ready when you are'}</h2><p>{tasks.length - completed} {tasks.length - completed === 1 ? 'task' : 'tasks'} left for today</p></div></div>
      <div className="stat"><span className="statIcon orange">◷</span><div><small>TO DO</small><h2>{tasks.length - completed}</h2><p>Keep going</p></div></div>
      <div className="stat"><span className="statIcon green">✓</span><div><small>COMPLETED</small><h2>{completed}</h2><p>Great work</p></div></div>
    </section>
    <section className="sectionHead"><div><h2>My tasks <span>{tasks.length}</span></h2><div className="filters">{['All', 'Pending', 'Completed'].map(name => <button className={filter === name ? 'selected' : ''} onClick={() => setFilter(name)} key={name}>{name}</button>)}</div></div><button className="textBtn" onClick={onAdd}>Add another <span>＋</span></button></section>
    <div className="taskList">{visibleTasks.map(task => <TaskItem key={task.id} task={task} onToggle={toggleTask} onEdit={onEdit} onDelete={deleteTask} />)}{!visibleTasks.length && <div className="empty">Nothing here yet. Add a task to get started.</div>}</div>
  </>;
}

function NoteCard({ note, onEdit, onDelete }) {
  return <article className={`note ${note.color}`} onClick={() => onEdit(note)}>
    <div className="noteTop"><span className="tag">{note.tag}</span><button aria-label="Delete note" onClick={event => { event.stopPropagation(); onDelete(note.id); }}>×</button></div>
    <h3>{note.title}</h3><p>{note.body}</p><footer><span>{formatTimestamp(note.updatedAt || note.updated)}</span><span>↗</span></footer>
  </article>;
}

function NotesDashboard({ notes, setNotes, query, setQuery, onEdit }) {
  const visibleNotes = useMemo(() => notes.filter(note => `${note.title} ${note.body} ${note.tag}`.toLowerCase().includes(query.toLowerCase())), [notes, query]);
  const deleteNote = id => setNotes(items => items.filter(item => item.id !== id));
  return <>
    <div className="noteToolbar"><div className="search">⌕<input aria-label="Search notes" placeholder="Search notes..." value={query} onChange={event => setQuery(event.target.value)} /></div><div className="viewToggle"><button className="on">▦</button><button>☷</button></div></div>
    <section className="sectionHead notesHead"><div><h2>All notes <span>{visibleNotes.length}</span></h2><p className="sub">A tidy space for your best ideas.</p></div><span className="sortLabel">Sorted by recent</span></section>
    <div className="notesGrid">{visibleNotes.map(note => <NoteCard key={note.id} note={note} onEdit={onEdit} onDelete={deleteNote} />)}{!visibleNotes.length && <div className="empty">No notes match your search.</div>}</div>
  </>;
}

function EditorModal({ type, editing, onClose, onSave }) {
  const isTask = type === 'tasks';
  return <div className="modalBackdrop" onClick={onClose}><form className="modal" onSubmit={onSave} onClick={event => event.stopPropagation()}>
    <div className="modalHead"><h2>{editing ? 'Edit' : 'Create'} {isTask ? 'task' : 'note'}</h2><button type="button" onClick={onClose}>×</button></div>
    <label>Title<input name="title" required defaultValue={editing?.title || ''} placeholder={isTask ? 'What needs doing?' : 'Give your note a title'} /></label>
    {isTask ? <div className="formRow"><label>Priority<select name="priority" defaultValue={editing?.priority || 'Medium'}><option>High</option><option>Medium</option><option>Low</option></select></label><label>Due date<input name="due" defaultValue={editing?.due === 'No due date' ? '' : editing?.due || ''} placeholder="e.g. Tomorrow" /></label></div> : <><label>Category<input name="tag" defaultValue={editing?.tag || ''} placeholder="Ideas, Planning..." /></label><label>Content<textarea name="body" required defaultValue={editing?.body || ''} placeholder="Write something worth remembering..." /></label></>}
    <button className="submit" type="submit">Save {isTask ? 'task' : 'note'}</button>
  </form></div>;
}

function loadStored(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
}

function App() {
  const [view, setView] = useState('tasks');
  const [tasks, setTasks] = useState(() => loadStored('focus-tasks', seedTasks));
  const [notes, setNotes] = useState(() => loadStored('focus-notes', seedNotes));
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => localStorage.setItem('focus-tasks', JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem('focus-notes', JSON.stringify(notes)), [notes]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = item => { setEditing(item); setModalOpen(true); };
  const closeModal = () => { setEditing(null); setModalOpen(false); };
  const saveItem = event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (view === 'tasks') {
      const item = { id: editing?.id || Date.now(), title: form.get('title').trim(), priority: form.get('priority'), due: form.get('due').trim() || 'No due date', done: editing?.done || false };
      setTasks(items => editing ? items.map(task => task.id === editing.id ? item : task) : [item, ...items]);
    } else {
      const item = { id: editing?.id || Date.now(), title: form.get('title').trim(), body: form.get('body').trim(), tag: form.get('tag').trim() || 'Personal', updatedAt: new Date().toISOString(), color: editing?.color || noteColors[Math.floor(Math.random() * noteColors.length)] };
      setNotes(items => editing ? items.map(note => note.id === editing.id ? item : note) : [item, ...items]);
    }
    closeModal();
  };

  return <div className="app">
    <Sidebar view={view} setView={setView} taskCount={tasks.filter(task => !task.done).length} noteCount={notes.length} />
    <main><AppHeader view={view} onAdd={openCreate} />{view === 'tasks' ? <TaskDashboard tasks={tasks} setTasks={setTasks} filter={filter} setFilter={setFilter} onEdit={openEdit} onAdd={openCreate} /> : <NotesDashboard notes={notes} setNotes={setNotes} query={query} setQuery={setQuery} onEdit={openEdit} />}</main>
    {modalOpen && <EditorModal type={view} editing={editing} onClose={closeModal} onSave={saveItem} />}
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
