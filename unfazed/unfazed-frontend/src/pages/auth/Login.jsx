import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api, { apiError } from '../../api/axiosInstance.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Alert from '../../components/common/Alert.jsx';

export default function Login() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues: { email: '', password: '' } });
  const [error, setError] = useState(null);
  const { saveSession } = useAuth(); const navigate = useNavigate(); const location = useLocation();
  const onSubmit = async (values) => { setError(null); try { const { data } = await api.post('/auth/login', values); saveSession(data); navigate(location.state?.from?.pathname || '/app/dashboard', { replace: true }); } catch (err) { setError(apiError(err)); } };
  return <AuthFrame title="Welcome back" subtitle="Your practice space is waiting.">
    {error && <Alert>{error}</Alert>}
    <form onSubmit={handleSubmit(onSubmit)} className="form-stack" noValidate>
      <label>Email address<input type="email" autoComplete="email" {...register('email', { required: 'Enter your email address.' })} />{errors.email && <small className="field-error">{errors.email.message}</small>}</label>
      <label>Password<input type="password" autoComplete="current-password" {...register('password', { required: 'Enter your password.' })} />{errors.password && <small className="field-error">{errors.password.message}</small>}</label>
      <button disabled={isSubmitting} className="button button--primary button--wide">{isSubmitting ? 'Signing in…' : 'Sign in'} <span>→</span></button>
    </form>
    <p className="auth-foot">New to Unfazed? <Link to="/register">Create your account</Link></p>
  </AuthFrame>;
}

function AuthFrame({ title, subtitle, children }) {
  return <main className="auth-layout"><section className="auth-aside"><Link to="/" className="brand brand--dark"><i>u</i><span>unfazed</span></Link><div><p className="eyebrow eyebrow--sage">A MORE PRESENT PRACTICE</p><h1>Make space for the work that matters.</h1><p>Thoughtful tools for the therapist behind every safe space.</p></div><div className="auth-aside__quote">“The admin gets quieter. The care stays at the centre.”</div></section><section className="auth-panel"><div className="auth-card"><Link className="back-link" to="/">← Back to home</Link><h2>{title}</h2><p>{subtitle}</p>{children}</div></section></main>;
}
