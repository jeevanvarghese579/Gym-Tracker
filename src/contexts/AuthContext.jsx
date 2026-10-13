import { createContext, useContext, useEffect, useState } from 'react';
import {
  browserLocalPersistence,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { auth } from '../firebase';
import { clearCache } from '../services/firestore';
import { requireAppAccess } from '../services/access';

const AuthContext = createContext();
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState(null);

  useEffect(() => {
    let unsubscribe = () => {};
    let disposed = false;

    const applyUser = async (user) => {
      const isGoogleUser = user?.providerData.some(
        (provider) => provider.providerId === GoogleAuthProvider.PROVIDER_ID
      );

      if (user && !isGoogleUser) {
        setCurrentUser(null);
        setAccessError(null);
        await signOut(auth);
        setLoading(false);
        return;
      }

      if (user) {
        try {
          await requireAppAccess(user);
          if (disposed) return;
          setCurrentUser(user);
          setAccessError(null);
        } catch (error) {
          console.error('[Gym Auth] Access check failed', error);
          if (disposed) return;
          setCurrentUser(null);
          setAccessError(error);

          // A confirmed Access Manager denial invalidates the local session.
          // Transient/offline failures must not erase Firebase's persisted user,
          // otherwise the user cannot recover their offline session.
          if (error?.code === 'access/denied') {
            await signOut(auth);
          }
          setLoading(false);
          return;
        }
      } else {
        setCurrentUser(null);
      }

      setAccessError(null);
      setLoading(false);
    };

    const startAuth = async () => {
      try {
        // Explicit local persistence keeps the authenticated Google session in
        // IndexedDB so Firebase can restore it without a network connection.
        await setPersistence(auth, browserLocalPersistence);
      } catch (error) {
        console.warn('[Gym Auth] IndexedDB auth persistence unavailable', error);
      }

      if (disposed) return;
      unsubscribe = onAuthStateChanged(auth, applyUser);
    };

    const retryAccessWhenOnline = () => {
      if (auth.currentUser) {
        setLoading(true);
        applyUser(auth.currentUser);
      }
    };

    startAuth();
    window.addEventListener('online', retryAccessWhenOnline);

    return () => {
      disposed = true;
      unsubscribe();
      window.removeEventListener('online', retryAccessWhenOnline);
    };
  }, []);

  const logout = async () => {
    await clearCache();
    return signOut(auth);
  };

  const signInWithGoogle = async () => {
    await setPersistence(auth, browserLocalPersistence);
    const credential = await signInWithPopup(auth, googleProvider);
    try {
      await requireAppAccess(credential.user);
      setAccessError(null);
      return credential;
    } catch (error) {
      if (error?.code === 'access/denied') {
        await signOut(auth);
      }
      setAccessError(error);
      throw error;
    }
  };

  const value = {
    currentUser,
    signInWithGoogle,
    logout,
    loading,
    accessError
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
