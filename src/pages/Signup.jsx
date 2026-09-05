import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Signup() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignup = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Google sign-up failed. Please try again.');
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
          <p>Create an account to start tracking your workouts.</p>
        </div>

        <div className="auth-form">
          {error && <div className="error-message">{error}</div>}

          <button
            type="button"
            className="btn btn-google"
            onClick={handleGoogleSignup}
            disabled={loading}
          >
            <span className="google-icon" aria-hidden="true">G</span>
            {loading ? 'Creating account...' : 'Sign up with Google'}
          </button>
          <p className="auth-provider-note">Only Google accounts are supported.</p>
        </div>

        <div className="auth-footer">
          <p>
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
