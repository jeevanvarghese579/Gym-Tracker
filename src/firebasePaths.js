import { collection, doc } from 'firebase/firestore';
import { db } from './firebase';

export const APP_KEY = 'gymTracker';

export const userCollection = (uid, name) =>
  collection(db, 'apps', APP_KEY, 'users', uid, name);

export const userDocument = (uid, name, id) =>
  doc(db, 'apps', APP_KEY, 'users', uid, name, id);

