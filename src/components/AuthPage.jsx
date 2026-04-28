import { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '../utils/firebase';
import { Shield, Mail, Lock, User, ArrowRight, AlertTriangle } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name) {
          await updateProfile(cred.user, { displayName: name });
        }
      }
    } catch (err) {
      const msg = err.code?.replace('auth/', '').replace(/-/g, ' ') || err.message;
      setError(msg.charAt(0).toUpperCase() + msg.slice(1));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        const msg = err.code?.replace('auth/', '').replace(/-/g, ' ') || err.message;
        setError(msg.charAt(0).toUpperCase() + msg.slice(1));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Shield size={24} />
          </div>
          <h1>FairLens AI</h1>
        </div>

        <div className="auth-card">
          <h2>{isLogin ? 'Sign in' : 'Create account'}</h2>
          <p className="auth-subtitle">
            {isLogin ? 'to continue to FairLens AI' : 'Start detecting bias in your datasets'}
          </p>

          {/* Error */}
          {error && (
            <div className="auth-error">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          {/* Google Sign In */}
          <button
            className="auth-google-btn"
            onClick={handleGoogleSignIn}
            disabled={loading}
            type="button"
            id="google-signin-btn"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            {loading ? 'Signing in...' : `Sign ${isLogin ? 'in' : 'up'} with Google`}
          </button>

          <div className="auth-divider">
            <span>or</span>
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailAuth}>
            {!isLogin && (
              <div className="auth-input-group">
                <label htmlFor="auth-name">
                  <User size={16} />
                  Full name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  className="input"
                  placeholder="Enter your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
            )}

            <div className="auth-input-group">
              <label htmlFor="auth-email">
                <Mail size={16} />
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                className="input"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="auth-input-group">
              <label htmlFor="auth-password">
                <Lock size={16} />
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                className="input"
                placeholder={isLogin ? 'Enter your password' : 'Create a password (6+ chars)'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button
              className="btn btn-primary auth-submit-btn"
              type="submit"
              disabled={loading}
              id="email-auth-btn"
            >
              {loading ? 'Please wait...' : isLogin ? 'Sign in' : 'Create account'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          {/* Toggle */}
          <div className="auth-toggle">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              className="btn-text"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              type="button"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>

        <p className="auth-footer">
          Bias Detection & Fairness Auditing Platform
        </p>
      </div>
    </div>
  );
}
