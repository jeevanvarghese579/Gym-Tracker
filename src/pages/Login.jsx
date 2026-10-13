import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
  const { signInWithGoogle, accessError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const updateConnectionStatus = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    return () => {
      window.removeEventListener('online', updateConnectionStatus);
      window.removeEventListener('offline', updateConnectionStatus);
    };
  }, []);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err?.message || 'Google sign-in failed. Please try again.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <img src="/gym-tracker-icon-192.png" alt="" className="auth-logo" />
          <h1>Gym Tracker</h1>
          <p>Welcome back! Log in to track your workouts.</p>
        </div>

        <div className="auth-form">
          {(error || accessError) && (
            <div className="error-message">
              {error || accessError.message}
            </div>
          )}

          {isOffline && !accessError && (
            <div className="error-message">
              Offline access is available after one successful online sign-in
              on this device.
            </div>
          )}

          <button
            type="button"
            className="btn btn-google"
            onClick={handleGoogleLogin}
            disabled={loading || isOffline}
          >
            <span className="google-icon" aria-hidden="true">G</span>
            {loading
              ? 'Signing in...'
              : isOffline
                ? 'Go online to sign in'
                : 'Continue with Google'}
          </button>
          <p className="auth-provider-note">Only Google accounts are supported.</p>
        </div>

        <div className="auth-footer">
          <p>
            Don’t have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
