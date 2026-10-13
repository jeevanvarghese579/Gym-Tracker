import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
 apiKey: "AIzaSyCOk_yef2gRBCdm8FwEgeidK7TrK1Yvcd0",
  authDomain: "inter-level-progress-manager.firebaseapp.com",
  projectId: "inter-level-progress-manager",
  storageBucket: "inter-level-progress-manager.firebasestorage.app",
  messagingSenderId: "379503088311",
  appId: "1:379503088311:web:f430dcb999873898133332",
  measurementId: "G-1KMRWVHDEC"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Keep previously loaded data in IndexedDB and queue writes while offline.
// Multiple-tab support prevents one open Gym Tracker tab from disabling
// persistence in the others.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
export const functions = getFunctions(app, 'us-central1');
