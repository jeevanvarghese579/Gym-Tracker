import { createContext, useContext, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const isGoogleUser = user?.providerData.some(
        (provider) => provider.providerId === GoogleAuthProvider.PROVIDER_ID
      );

      if (user && !isGoogleUser) {
        setCurrentUser(null);
        signOut(auth).finally(() => setLoading(false));
        return;
      }

      if (user) {
        try {
          await requireAppAccess(user);
        } catch (error) {
          console.error('[Gym Auth] Access denied', error);
          setCurrentUser(null);
          await signOut(auth);
          setLoading(false);
          return;
        }
      }

      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    await clearCache();
    return signOut(auth);
  };

  const signInWithGoogle = async () => {
    const credential = await signInWithPopup(auth, googleProvider);
    try {
      await requireAppAccess(credential.user);
      return credential;
    } catch (error) {
      await signOut(auth);
      throw error;
    }
  };

  const value = {
    currentUser,
    signInWithGoogle,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
