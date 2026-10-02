import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api, { apiError } from '../../api/axiosInstance.js';
import Alert from '../../components/common/Alert.jsx';
import Loading from '../../components/common/Loading.jsx';

const money = (paise) => `₹${(Number(paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true); script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Payment() {
  const { slug } = useParams(); const [search] = useSearchParams(); const navigate = useNavigate();
  const paymentId = search.get('payment'); const token = search.get('token');
  const [payment, setPayment] = useState(null); const [therapist, setTherapist] = useState(null); const [notice, setNotice] = useState(null); const [isPaying, setIsPaying] = useState(false);
  const load = async () => { if (!paymentId || !token) { setNotice('This payment link is incomplete. Please return to the practice page.'); return; } try { const [profile, currentPayment] = await Promise.all([api.get(`/therapists/public/${slug}`), api.get(`/public/payments/${paymentId}`, { params: { token } })]); setTherapist(profile.data.therapist); setPayment(currentPayment.data.payment); } catch (error) { setNotice(apiError(error)); } };
  useEffect(() => { load(); }, [paymentId, token, slug]);
  const confirmDemo = async () => { setIsPaying(true); setNotice(null); try { const { data } = await api.post(`/public/payments/${paymentId}/demo-confirm`, { checkoutToken: token }); setPayment((current) => ({ ...current, ...data.payment, invoiceUrl: data.payment.invoiceUrl ? `/api/public/payments/${paymentId}/invoice?token=${encodeURIComponent(token)}` : null })); setNotice({ type: 'success', text: 'Demo payment confirmed. Your invoice is ready.' }); } catch (error) { setNotice(apiError(error)); } finally { setIsPaying(false); } };
  const openRazorpay = async () => { setIsPaying(true); setNotice(null); const ready = await loadRazorpay(); if (!ready) { setNotice('Razorpay checkout could not load. Check your internet connection and try again.'); setIsPaying(false); return; } const razorpay = new window.Razorpay({ key: payment.checkout.keyId, amount: payment.amount, currency: payment.currency, name: therapist?.name || 'Unfazed practice', description: payment.description, order_id: payment.checkout.orderId, handler: async (response) => { try { const { data } = await api.post(`/public/payments/${paymentId}/verify`, { checkoutToken: token, ...response }); setPayment(data.payment); setNotice({ type: 'success', text: 'Payment verified. Your invoice will appear once Razorpay sends its secure confirmation.' }); } catch (error) { setNotice(apiError(error)); } finally { setIsPaying(false); } }, modal: { ondismiss: () => setIsPaying(false) }, theme: { color: '#203a36' } }); razorpay.open(); };
  if (!payment && !notice) return <div className="page-loading"><Loading label="Opening secure payment"/></div>;
  return <main className="payment-page"><header className="booking-header"><Link to={`/${slug}`} className="back-link">← Back to {therapist?.name || 'practice'}</Link><span><i>u</i> unfazed</span></header><section className="payment-wrap">{notice && <Alert type={typeof notice === 'object' ? notice.type : 'error'}>{typeof notice === 'object' ? notice.text : notice}</Alert>}{payment && <div className="payment-card"><p className="eyebrow eyebrow--sage">SECURE PAYMENT</p><h1>{payment.status === 'captured' ? 'Payment complete.' : 'One last small step.'}</h1><p>{payment.status === 'captured' ? 'Thank you. Your appointment and payment have been recorded.' : 'Complete your payment to confirm this booking or activate your session package.'}</p><div className="payment-summary"><span>{payment.description}</span><b>{money(payment.amount)}</b></div>{payment.status === 'captured' ? <div className="payment-actions">{payment.invoiceUrl && <a className="button button--primary" href={payment.invoiceUrl}>Download invoice <span>↓</span></a>}<button className="button button--quiet" onClick={() => { sessionStorage.setItem('unfazed_portal_token', token); navigate('/portal'); }}>Open client portal</button></div> : payment.status === 'authorized' ? <Alert type="info">Payment has been verified and is awaiting Razorpay webhook confirmation.</Alert> : payment.checkout?.mode === 'demo' ? <button disabled={isPaying} className="button button--primary button--wide" onClick={confirmDemo}>{isPaying ? 'Confirming…' : `Confirm demo payment · ${money(payment.amount)}`} <span>→</span></button> : <button disabled={isPaying} className="button button--primary button--wide" onClick={openRazorpay}>{isPaying ? 'Opening Razorpay…' : `Pay securely · ${money(payment.amount)}`} <span>→</span></button>}<small className="payment-security">Payments are processed by Razorpay. Unfazed does not store card or UPI credentials.</small></div>}</section></main>;
}
