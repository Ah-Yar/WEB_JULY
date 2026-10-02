import { Link } from 'react-router-dom';

const labels = {
  active_clients: 'Active client capacity',
  structured_note_templates: 'Structured SOAP and DAP templates',
  analytics_depth: 'Deeper analytics history'
};

export default function UpgradePrompt({ upgrade, onClose }) {
  if (!upgrade) return null;
  const current = upgrade.currentTier?.name || 'current';
  const recommended = upgrade.recommendedTier?.name;
  return <div className="upgrade-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="upgrade-prompt" role="dialog" aria-modal="true" aria-labelledby="upgrade-title" onMouseDown={(event) => event.stopPropagation()}>
      <button className="upgrade-prompt__close" type="button" aria-label="Close upgrade prompt" onClick={onClose}>×</button>
      <p className="eyebrow">PLAN LIMIT REACHED</p>
      <span className="upgrade-prompt__mark">✦</span>
      <h2 id="upgrade-title">Make room for what’s next.</h2>
      <p>{labels[upgrade.featureKey] || 'This feature'} is not available on your <b>{current}</b> plan.</p>
      {upgrade.limit !== undefined && <div className="upgrade-prompt__limit"><b>{upgrade.usage} of {upgrade.limit}</b><span>{upgrade.unit || 'included capacity'} in use</span></div>}
      {recommended && <p className="upgrade-prompt__recommendation"><b>{recommended}</b> is the next plan with more room for this feature.</p>}
      <div className="upgrade-prompt__actions"><Link className="button button--primary" to="/app/analytics" onClick={onClose}>Review plans <span>→</span></Link><button className="button button--quiet" type="button" onClick={onClose}>Not now</button></div>
      <small>Plan switching is available in local demo mode. Production plan changes should be handled through billing.</small>
    </section>
  </div>;
}
