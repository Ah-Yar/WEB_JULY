export default function ProfileHero({ therapist, onBook, onIntake }) {
  const specialties = therapist.specializations?.length ? therapist.specializations : ['Individual therapy', 'Emotional wellbeing'];
  return <section className="profile-hero">
    <div className="profile-hero__copy">
      <p className="eyebrow eyebrow--sage">THERAPY WITH {therapist.name?.split(' ')[0]?.toUpperCase()}</p>
      <h1>{therapist.headline || 'A calmer space to begin again.'}</h1>
      <p className="profile-hero__intro">{therapist.bio || 'Thoughtful, confidential support for the moments that ask you to pause, understand, and move forward.'}</p>
      <div className="chip-row">{specialties.map((item) => <span className="chip" key={item}>{item}</span>)}</div>
      <div className="hero-actions"><button onClick={onBook} className="button button--primary">Book a session <span>→</span></button><button onClick={onIntake} className="button button--quiet">Complete intake</button></div>
    </div>
    <div className="profile-hero__visual"><div className="hero-arch"><div className="leaf leaf--one"/><div className="leaf leaf--two"/><div className="leaf leaf--three"/><div className="hero-initials">{therapist.name?.split(' ').filter(Boolean).slice(-1)[0]?.slice(0, 1) || 'U'}</div></div><p><span>●</span> Accepting new clients</p></div>
  </section>;
}
