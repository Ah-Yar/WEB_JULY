export default function Alert({ children, type = 'error' }) {
  return <div className={`alert alert--${type}`} role={type === 'error' ? 'alert' : 'status'}>{children}</div>;
}
