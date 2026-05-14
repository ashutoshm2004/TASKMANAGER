import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'member' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await signup(form.name, form.email, form.password, form.role);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.left}>
        <div style={styles.brand}>
          <div style={styles.logo}>TF</div>
          <span style={styles.brandName}>TaskFlow</span>
        </div>
        <div style={styles.hero}>
          <h1 style={styles.heroTitle}>Ship faster,<br />together.</h1>
          <p style={styles.heroSub}>Manage projects, assign tasks, and track progress with your team — all in one place.</p>
          <div style={styles.features}>
            {['Role-based access control', 'Real-time task tracking', 'Project dashboards', 'Team collaboration'].map(f => (
              <div key={f} style={styles.feature}>
                <span style={styles.check}>✓</span> {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.right}>
        <div style={styles.card}>
          <div style={styles.tabs}>
            <button style={mode === 'login' ? styles.tabActive : styles.tab} onClick={() => setMode('login')}>Sign In</button>
            <button style={mode === 'signup' ? styles.tabActive : styles.tab} onClick={() => setMode('signup')}>Sign Up</button>
          </div>

          <form onSubmit={submit} style={styles.form}>
            {mode === 'signup' && (
              <div className="form-group">
                <label>Full Name</label>
                <input name="name" value={form.name} onChange={handle} placeholder="John Doe" required />
              </div>
            )}
            <div className="form-group">
              <label>Email</label>
              <input name="email" type="email" value={form.email} onChange={handle} placeholder="you@company.com" required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input name="password" type="password" value={form.password} onChange={handle} placeholder="••••••••" required />
            </div>
            {mode === 'signup' && (
              <div className="form-group">
                <label>Role</label>
                <select name="role" value={form.role} onChange={handle}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}
            {error && <div className="form-error" style={{background:'rgba(239,68,68,0.1)',padding:'10px 14px',borderRadius:'8px'}}>{error}</div>}
            <button type="submit" className="btn-primary" style={{width:'100%',padding:'12px'}} disabled={loading}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {mode === 'login' && (
            <p style={{color:'var(--text3)',fontSize:'12px',textAlign:'center',marginTop:'16px'}}>
              Demo: signup as Admin to manage projects, or Member to join them.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { display:'flex', minHeight:'100vh' },
  left: {
    flex:1, background:'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
    padding:'48px', display:'flex', flexDirection:'column', gap:'auto',
    borderRight:'1px solid #1e293b',
  },
  brand: { display:'flex', alignItems:'center', gap:'12px', marginBottom:'auto' },
  logo: {
    width:40, height:40, borderRadius:'10px',
    background:'var(--primary)', color:'#fff',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontWeight:800, fontSize:'16px',
  },
  brandName: { fontSize:'20px', fontWeight:800, color:'#fff' },
  hero: { paddingTop:'80px', paddingBottom:'80px' },
  heroTitle: { fontSize:'52px', fontWeight:800, lineHeight:1.1, color:'#fff', marginBottom:'20px' },
  heroSub: { fontSize:'18px', color:'#94a3b8', marginBottom:'32px', lineHeight:1.6 },
  features: { display:'flex', flexDirection:'column', gap:'12px' },
  feature: { display:'flex', alignItems:'center', gap:'10px', color:'#cbd5e1', fontSize:'15px' },
  check: { color:'var(--success)', fontWeight:700, fontSize:'16px' },
  right: {
    width:'440px', display:'flex', alignItems:'center', justifyContent:'center',
    padding:'48px 32px', background:'var(--bg)',
  },
  card: { width:'100%', maxWidth:'380px' },
  tabs: { display:'flex', gap:'4px', background:'var(--bg2)', borderRadius:'10px', padding:'4px', marginBottom:'24px' },
  tab: { flex:1, padding:'8px', background:'transparent', color:'var(--text3)', borderRadius:'8px', fontWeight:600, fontSize:'14px' },
  tabActive: { flex:1, padding:'8px', background:'var(--bg3)', color:'var(--text)', borderRadius:'8px', fontWeight:600, fontSize:'14px' },
  form: { display:'flex', flexDirection:'column', gap:'16px' },
};
