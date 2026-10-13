import { httpsCallable } from 'firebase/functions';
import { app, functions } from '../firebase';
import { offerAccessRequest } from './accessRequestDialog';
import {
  forgetApprovedAccess,
  hasApprovedAccess,
  rememberApprovedAccess
} from './offlineAccess';

function isOfflineError(error) {
  return !navigator.onLine || [
    'functions/unavailable',
    'functions/deadline-exceeded',
    'functions/internal'
  ].includes(error?.code);
}

function offlineVerificationError() {
  const error = new Error(
    'Connect to the internet once to verify Gym Tracker access on this device.'
  );
  error.code = 'access/offline-verification-required';
  return error;
}

export async function requireAppAccess(user) {
  const appId = app.options.appId;
  if (!appId) throw new Error('Firebase Access Manager is not configured.');

  // Avoid waiting for a Cloud Function timeout when the browser already knows
  // it is offline. Only a previously approved app/user pair may continue.
  if (!navigator.onLine) {
    const hasCachedApproval = await hasApprovedAccess(appId, user.uid)
      .catch(() => false);
    if (hasCachedApproval) return user;
    throw offlineVerificationError();
  }

  try {
    const result = await httpsCallable(functions, 'checkMyAccess')({ appId });
    const data = result.data && typeof result.data === 'object' ? result.data : {};
    if (data.allowed !== true) {
      await forgetApprovedAccess(appId, user.uid).catch((cacheError) => {
        console.warn('[Gym Auth] Could not clear offline access cache', cacheError);
      });
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

    await rememberApprovedAccess(appId, user.uid).catch((cacheError) => {
      // IndexedDB can be unavailable in some private browsing modes. Online
      // access should still work; only the offline fallback is affected.
      console.warn('[Gym Auth] Could not cache approved access', cacheError);
    });
    return user;
  } catch (error) {
    if (error?.code === 'access/denied' || !isOfflineError(error)) {
      throw error;
    }

    const hasCachedApproval = await hasApprovedAccess(appId, user.uid)
      .catch(() => false);
    if (hasCachedApproval) {
      return user;
    }

    throw offlineVerificationError();
  }
}
