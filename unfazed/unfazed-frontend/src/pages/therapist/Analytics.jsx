import { useCallback, useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api, { apiError } from '../../api/axiosInstance.js';
import AppShell from '../../components/common/AppShell.jsx';
import Alert from '../../components/common/Alert.jsx';
import Loading from '../../components/common/Loading.jsx';
import UpgradePrompt from '../../components/subscription/UpgradePrompt.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const money = (paise) => `₹${Math.round(Number(paise || 0) / 100).toLocaleString('en-IN')}`;
const featureList = (tier) => [
  `${tier.caps.activeClients} active clients`,
  `${tier.caps.analyticsHistoryMonths} month${tier.caps.analyticsHistoryMonths === 1 ? '' : 's'} analytics history`,
  tier.featureFlags.structuredNoteTemplates ? 'SOAP & DAP templates' : 'Freeform notes',
  tier.featureFlags.advancedAnalytics ? 'Advanced analytics' : 'Core analytics'
];

export default function Analytics() {
  const { refresh } = useAuth();
  const [months, setMonths] = useState(1); const [analytics, setAnalytics] = useState(null); const [subscription, setSubscription] = useState(null); const [notice, setNotice] = useState(null); const [upgrade, setUpgrade] = useState(null); const [isChangingPlan, setIsChangingPlan] = useState('');
  const loadSubscription = useCallback(async () => {
    const { data } = await api.get('/subscription'); setSubscription(data);
  }, []);
  const loadAnalytics = useCallback(async (historyMonths) => {
    setNotice(null); setAnalytics(null);
    try { const { data } = await api.get('/analytics', { params: { months: historyMonths } }); setAnalytics(data); }
    catch (error) {
      const promptedUpgrade = error?.response?.data?.error?.details?.upgrade;
      if (promptedUpgrade) setUpgrade(promptedUpgrade); else setNotice({ type: 'error', text: apiError(error) });
    }
  }, []);
  useEffect(() => { loadSubscription().catch((error) => setNotice({ type: 'error', text: apiError(error) })); loadAnalytics(1); }, [loadSubscription, loadAnalytics]);
  const choosePeriod = (value) => { const next = Number(value); setMonths(next); loadAnalytics(next); };
  const switchPlan = async (tierKey) => {
    setIsChangingPlan(tierKey); setNotice(null);
    try {
      const { data } = await api.post('/subscription/demo-switch-tier', { tierKey });
      setSubscription({ subscription: data.subscription, tiers: data.tiers });
      await refresh();
      const permittedMonths = Math.min(months, data.subscription.entitlements.analyticsHistoryMonths);
      setMonths(permittedMonths); setUpgrade(null); await loadAnalytics(permittedMonths);
      setNotice({ type: 'success', text: data.message });
    } catch (error) { setNotice({ type: 'error', text: apiError(error) }); }
    finally { setIsChangingPlan(''); }
  };
  const allowedMonths = subscription?.subscription?.entitlements?.analyticsHistoryMonths || 1;
  const metrics = analytics?.metrics;
  return <AppShell title="Analytics & plan" eyebrow="PRACTICE INTELLIGENCE"><div className="content-wide analytics-page">
    {notice && <Alert type={notice.type}>{notice.text}</Alert>}
    {!subscription ? <Loading label="Loading your plan and practice data"/> : <>
      <section className="plan-summary panel">
        <div><p className="eyebrow">CURRENT PLAN</p><h2>{subscription.subscription.tier.name}</h2><p>{subscription.subscription.tier.description}</p></div>
        <div className="plan-summary__usage"><span>ACTIVE CLIENTS</span><b>{subscription.subscription.entitlements.activeClients.used} <small>/ {subscription.subscription.entitlements.activeClients.limit}</small></b><p>Current practice capacity</p></div>
      </section>
      <section className="analytics-controls"><div><p className="eyebrow">REAL AGGREGATED DATA</p><h2>See the shape of your practice.</h2><p>Revenue, client capacity, and attendance are calculated by MongoDB aggregation pipelines — not in the browser.</p></div><label>History window<select value={months} onChange={(event) => choosePeriod(event.target.value)}>{[1, 3, 6, 12, 24].map((value) => <option key={value} value={value}>{value} month{value === 1 ? '' : 's'}{value > allowedMonths ? ' · requires upgrade' : ''}</option>)}</select></label></section>
      {!analytics ? <Loading label="Preparing analytics"/> : <>
        <section className="stat-grid analytics-stat-grid"><article className="stat-card"><span>CAPTURED REVENUE</span><b>{money(metrics.revenue)}</b><p>For the selected period</p></article><article className="stat-card"><span>ACTIVE CLIENTS</span><b>{metrics.activeClients}</b><p>{subscription.subscription.entitlements.activeClients.limit - metrics.activeClients} places before your current cap</p></article><article className="stat-card"><span>NO-SHOW RATE</span><b>{metrics.noShowRate}%</b><p>{metrics.noShows} no-show{metrics.noShows === 1 ? '' : 's'} across {metrics.totalSessions} sessions</p></article></section>
        <section className="analytics-chart panel"><div className="panel-heading"><div><p className="eyebrow">REVENUE TREND</p><h2>Captured payments</h2></div><span>{analytics.period.months}-month view · INR</span></div><div className="analytics-chart__canvas"><ResponsiveContainer width="100%" height={270}><AreaChart data={analytics.revenueTrend} margin={{ top: 12, right: 10, left: -18, bottom: 0 }}><defs><linearGradient id="revenueWash" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6f927b" stopOpacity={0.35}/><stop offset="100%" stopColor="#6f927b" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#ece8e0" vertical={false}/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#78847c', fontSize: 11 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: '#78847c', fontSize: 10 }} tickFormatter={(value) => `₹${Math.round(value / 100)}`}/><Tooltip formatter={(value) => [money(value), 'Revenue']} labelStyle={{ color: '#203a36' }} contentStyle={{ border: '1px solid #ded9cf', borderRadius: 2, fontSize: 12 }}/><Area type="monotone" dataKey="revenue" stroke="#537a65" strokeWidth={2.3} fill="url(#revenueWash)"/></AreaChart></ResponsiveContainer></div><p className="analytics-chart__note">Only successfully captured payments are included in this trend.</p></section>
      </>}
      <section className="tier-section"><div className="panel-heading"><div><p className="eyebrow">CONFIG-DRIVEN ENTITLEMENTS</p><h2>Plans that grow with your practice</h2></div><span className="tier-section__note">Local demo plan selector</span></div><div className="tier-grid">{subscription.tiers.map((tier) => { const current = tier.key === subscription.subscription.tier.key; return <article className={`tier-card ${current ? 'tier-card--current' : ''}`} key={tier.key}>{current && <span className="tier-card__current">CURRENT PLAN</span>}<h3>{tier.name}</h3><p>{tier.description}</p><ul>{featureList(tier).map((item) => <li key={item}>✓ {item}</li>)}</ul>{current ? <button type="button" className="button button--quiet" disabled>Current plan</button> : <button type="button" className="button button--primary" disabled={Boolean(isChangingPlan)} onClick={() => switchPlan(tier.key)}>{isChangingPlan === tier.key ? 'Changing…' : `Try ${tier.name} locally`} <span>→</span></button>}</article>; })}</div></section>
    </>}
    <UpgradePrompt upgrade={upgrade} onClose={() => setUpgrade(null)}/>
  </div></AppShell>;
}
