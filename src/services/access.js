import { httpsCallable } from 'firebase/functions';
import { app, functions } from '../firebase';
import { offerAccessRequest } from './accessRequestDialog';

export async function requireAppAccess(user) {
  const appId = app.options.appId;
  if (!appId) throw new Error('Firebase Access Manager is not configured.');
  const result = await httpsCallable(functions, 'checkMyAccess')({ appId });
  const data = result.data && typeof result.data === 'object' ? result.data : {};
  if (data.allowed !== true) {
    await offerAccessRequest({
      appName: 'Gym Tracker',
      requestStatus: data.requestStatus,
      sendRequest: async () => (await httpsCallable(functions, 'requestAppAccess')({
        appId,
        requestType: 'access-request',
      })).data,
    });
    const error = new Error(data.requestStatus === 'pending'
      ? 'Your access request is awaiting administrator approval.'
      : 'Your account is not approved for Gym Tracker.');
    error.code = 'access/denied';
    throw error;
  }
  return user;
}
