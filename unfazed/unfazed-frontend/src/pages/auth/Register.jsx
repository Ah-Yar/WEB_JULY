import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import api, { apiError } from '../../api/axiosInstance.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Alert from '../../components/common/Alert.jsx';

export default function Register() {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();
  const [error, setError] = useState(null); const { saveSession } = useAuth(); const navigate = useNavigate();
  const onSubmit = async (values) => { setError(null); try { const { data } = await api.post('/auth/register', values); saveSession(data); navigate('/app/profile', { replace: true }); } catch (err) { setError(apiError(err)); } };
  return <main className="auth-layout"><section className="auth-aside"><Link to="/" className="brand brand--dark"><i>u</i><span>unfazed</span></Link><div><p className="eyebrow eyebrow--sage">BEGIN WITH THE ESSENTIALS</p><h1>Your practice, made more spacious.</h1><p>Set up a polished, shareable client experience in a few considered steps.</p></div><div className="auth-aside__quote">A calm system is a kind of care, too.</div></section><section className="auth-panel"><div className="auth-card auth-card--wide"><Link className="back-link" to="/">← Back to home</Link><h2>Create your practice</h2><p>Start with your secure therapist account.</p>{error && <Alert>{error}</Alert>}
    <form onSubmit={handleSubmit(onSubmit)} className="form-stack" noValidate>
      <label>Your name<input placeholder="Dr. Ananya Shah" autoComplete="name" {...register('name', { required: 'Enter your name.', minLength: { value: 2, message: 'Use at least 2 characters.' } })}/>{errors.name && <small className="field-error">{errors.name.message}</small>}</label>
      <label>Work email<input type="email" placeholder="you@practice.com" autoComplete="email" {...register('email', { required: 'Enter a valid email.', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email.' } })}/>{errors.email && <small className="field-error">{errors.email.message}</small>}</label>
      <label>Public link <span className="label-hint">optional</span><div className="prefix-input"><span>unfazed.in/</span><input placeholder="dr-ananya" {...register('slug', { pattern: { value: /^[a-zA-Z0-9\s-]*$/, message: 'Letters, numbers and hyphens only.' } })}/></div>{errors.slug && <small className="field-error">{errors.slug.message}</small>}</label>
      <label>Password<input type="password" autoComplete="new-password" {...register('password', { required: 'Create a password.', minLength: { value: 8, message: 'Use at least 8 characters.' } })}/>{errors.password && <small className="field-error">{errors.password.message}</small>}</label>
      <label>Confirm password<input type="password" autoComplete="new-password" {...register('passwordConfirmation', { required: 'Confirm your password.', validate: (value) => value === watch('password') || 'Passwords do not match.' })}/>{errors.passwordConfirmation && <small className="field-error">{errors.passwordConfirmation.message}</small>}</label>
      <button disabled={isSubmitting} className="button button--primary button--wide">{isSubmitting ? 'Creating account…' : 'Create practice'} <span>→</span></button>
    </form><p className="auth-foot">Already have an account? <Link to="/login">Sign in</Link></p>
  </div></section></main>;
}
