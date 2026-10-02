import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axiosInstance.js';
import Loading from '../../components/common/Loading.jsx';
import ProfileHero from '../../components/profile/ProfileHero.jsx';
import ServiceCard from '../../components/profile/ServiceCard.jsx';
import { demoTherapist } from '../../data/demo.js';

export default function PublicProfile() {
  const { slug } = useParams(); const navigate = useNavigate();
  const [therapist, setTherapist] = useState(null); const [packages, setPackages] = useState([]); const [previewMode, setPreviewMode] = useState(false); const [notFound, setNotFound] = useState(false);
  useEffect(() => { let mounted = true; setTherapist(null); setPackages([]); setNotFound(false); api.get(`/therapists/public/${slug}`).then(({ data }) => { if (mounted) setTherapist(data.therapist); }).catch(() => { if (!mounted) return; if (slug === 'dr-ananya') { setTherapist(demoTherapist); setPreviewMode(true); } else setNotFound(true); }); return () => { mounted = false; }; }, [slug]);
  useEffect(() => { if (!therapist || previewMode) return; api.get(`/public/therapists/${slug}/packages`).then(({ data }) => setPackages(data.packages)).catch(() => setPackages([])); }, [therapist, slug, previewMode]);
  useEffect(() => { if (!therapist) return; const title = `${therapist.name} | Unfazed`; const description = therapist.headline || therapist.bio || `Book a session with ${therapist.name}.`; document.title = title; const upsertMeta = (attribute, key, value) => { let meta = document.head.querySelector(`meta[${attribute}="${key}"]`); if (!meta) { meta = document.createElement('meta'); meta.setAttribute(attribute, key); document.head.appendChild(meta); } meta.setAttribute('content', value); }; upsertMeta('name', 'description', description); upsertMeta('property', 'og:title', title); upsertMeta('property', 'og:description', description); upsertMeta('property', 'og:url', window.location.href); }, [therapist]);
  if (!therapist && !notFound) return <div className="page-loading"><Loading label="Opening this practice" /></div>;
  if (notFound) return <main className="public-page public-page--simple"><div className="not-found"><span>u</span><h1>This practice page is taking a breath.</h1><p>Check the link and try again.</p><button className="button button--primary" onClick={() => navigate('/')}>Visit Unfazed</button></div></main>;
  const goToBooking = (service) => navigate(`/${slug}/book${service ? `?duration=${service.durationMinutes}` : ''}`);
  return <main className="public-page"><header className="public-nav"><a href="/" className="brand brand--dark"><i>u</i><span>unfazed</span></a><span>Your space for care</span></header>{previewMode && <div className="preview-banner">Demo profile shown — connect the API and seed the database to use live data.</div>}
    <ProfileHero therapist={therapist} onBook={() => goToBooking(therapist.services?.[0])} onIntake={() => navigate(`/${slug}/intake`)} />
    <section className="profile-section profile-section--services"><div className="section-heading"><p className="eyebrow">WAYS WE CAN WORK TOGETHER</p><h2>Choose what feels right to begin with.</h2></div><div className="service-grid">{therapist.services?.length ? therapist.services.map((service) => <ServiceCard key={service._id || service.title} service={service} onBook={goToBooking}/>) : <p>No services have been published yet.</p>}</div></section>
    {packages.length > 0 && <section className="profile-section profile-section--packages"><div className="section-heading"><p className="eyebrow">CONTINUING CARE</p><h2>Session packages</h2></div><div className="public-package-grid">{packages.map((item) => <article className="public-package-card" key={item.id}><span>{item.sessionCount} SESSIONS</span><h3>{item.title}</h3><p>{item.description || `Valid for ${item.expiryDays} days.`}</p><b>₹{Number(item.price).toLocaleString('en-IN')}</b><button className="text-button" onClick={() => navigate(`/${slug}/packages?package=${item.id}`)}>Choose package <span>→</span></button></article>)}</div></section>}
    <section className="profile-section profile-section--details"><article><p className="eyebrow">A LITTLE MORE</p><h2>Held with care, at your pace.</h2><p>Sessions are a space to arrive as you are. We can begin with what feels most present and move at a pace that supports you.</p></article><article className="profile-details"><div><span>Languages</span><b>{therapist.languages?.join(' · ') || 'English'}</b></div><div><span>Session timezone</span><b>{therapist.timezone || 'Asia/Kolkata'}</b></div><div><span>New clients</span><b>Currently welcome</b></div></article></section>
    <footer className="public-footer"><span><i>u</i> unfazed</span><p>Practice, with presence.</p></footer>
  </main>;
}
