const DB_NAME = 'gym-tracker-local';
const DB_VERSION = 1;
const ACCESS_STORE = 'approvedAccess';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(ACCESS_STORE)) {
        database.createObjectStore(ACCESS_STORE, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function accessKey(appId, userId) {
  return `${appId}:${userId}`;
}

async function runTransaction(mode, action) {
  const database = await openDatabase();

  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(ACCESS_STORE, mode);
      const store = transaction.objectStore(ACCESS_STORE);
      const request = action(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export async function rememberApprovedAccess(appId, userId) {
  return runTransaction('readwrite', (store) => store.put({
    key: accessKey(appId, userId),
    appId,
    userId,
    approvedAt: Date.now()
  }));
}

export async function hasApprovedAccess(appId, userId) {
  const record = await runTransaction('readonly', (store) => (
    store.get(accessKey(appId, userId))
  ));
  return Boolean(record);
}

export async function forgetApprovedAccess(appId, userId) {
  return runTransaction('readwrite', (store) => (
    store.delete(accessKey(appId, userId))
  ));
}
