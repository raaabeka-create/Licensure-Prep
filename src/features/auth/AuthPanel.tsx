import { useState } from 'react';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

export default function AuthPanel() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isSupabaseConfigured || !supabase) {
    return <p className="auth-note">Cloud sign-in is not configured. Offline study remains available.</p>;
  }

  async function signIn() {
    setBusy(true);
    setMessage('');
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    setMessage(error ? error.message : 'Signed in successfully.');
    setBusy(false);
  }

  async function signUp() {
    setBusy(true);
    setMessage('');
    const { error } = await supabase!.auth.signUp({ email, password });
    setMessage(error ? error.message : 'Account request submitted. Check your email if verification is enabled.');
    setBusy(false);
  }

  return (
    <section className="auth-panel">
      <h2>Cloud account</h2>
      <p>Sign in to back up quiz history across devices. You can still practise offline.</p>
      <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <div className="auth-actions">
        <button type="button" disabled={busy || !email || !password} onClick={signIn}>Sign in</button>
        <button type="button" className="secondary" disabled={busy || !email || password.length < 8} onClick={signUp}>Create account</button>
      </div>
      {message && <p className="auth-message" role="status">{message}</p>}
    </section>
  );
}
