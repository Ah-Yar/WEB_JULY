export default function ServiceCard({ service, onBook }) {
  return <article className="service-card">
    <div className="service-card__top"><span>{service.durationMinutes} MIN</span>{service.price > 0 && <b>₹{Number(service.price).toLocaleString('en-IN')}</b>}</div>
    <h3>{service.title}</h3><p>{service.description || 'A confidential, supportive space made for you.'}</p>
    {onBook && <button className="text-button" onClick={() => onBook(service)}>Book this session <span>→</span></button>}
  </article>;
}
