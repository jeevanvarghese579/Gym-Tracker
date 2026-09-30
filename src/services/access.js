import { httpsCallable } from 'firebase/functions';
import { app, functions } from '../firebase';

export async function requireAppAccess(user) {
  const appId = app.options.appId;
  if (!appId) throw new Error('Firebase Access Manager is not configured.');
  const result = await httpsCallable(functions, 'checkMyAccess')({ appId });
  const data = result.data && typeof result.data === 'object' ? result.data : {};
  if (data.allowed !== true) {
    const error = new Error('Your account is not approved for Gym Tracker. Contact the administrator for access.');
    error.code = 'access/denied';
    throw error;
  }
  return user;
}
