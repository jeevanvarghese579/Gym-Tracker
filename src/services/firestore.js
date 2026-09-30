import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  Timestamp,
  query,
  where,
  limit,
  startAfter,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns';

const APP_ROOT = ['apps', 'gymTracker', 'users'];

const DEFAULT_BODY_PARTS = [
  'Chest',
  'Shoulder',
  'Back',
  'Biceps',
  'Triceps',
  'Legs',
  'Abs',
  'Cardio'
];

// Simple in-memory cache for body parts only (rarely changes)
let bodyPartsCache = new Map();

// Workout cache to avoid repeated fetches
let workoutsCache = new Map();

// Body Parts Operations
export async function getBodyParts(userId) {
  if (bodyPartsCache.has(userId)) {
    return bodyPartsCache.get(userId);
  }

  const docRef = doc(db, ...APP_ROOT, userId, 'settings', 'bodyParts');
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const parts = docSnap.data().items || [];
    bodyPartsCache.set(userId, parts);
    return parts;
  }

  // Create default body parts if none exist
  await setDoc(docRef, { items: DEFAULT_BODY_PARTS });
  bodyPartsCache.set(userId, DEFAULT_BODY_PARTS);
  return DEFAULT_BODY_PARTS;
}

export async function addBodyPart(userId, bodyPart) {
  const currentParts = await getBodyParts(userId);

  if (!currentParts.includes(bodyPart)) {
    const newParts = [...currentParts, bodyPart];
    const docRef = doc(db, ...APP_ROOT, userId, 'settings', 'bodyParts');
    await setDoc(docRef, { items: newParts });
    bodyPartsCache.set(userId, newParts);
    return newParts;
  }

  return currentParts;
}

export async function editBodyPart(userId, oldPart, newPart) {
  const currentParts = await getBodyParts(userId);
  const index = currentParts.indexOf(oldPart);

  if (index !== -1) {
    currentParts[index] = newPart;
    const docRef = doc(db, ...APP_ROOT, userId, 'settings', 'bodyParts');
    await setDoc(docRef, { items: currentParts });
    bodyPartsCache.set(userId, [...currentParts]);
    return [...currentParts];
  }

  return currentParts;
}

export async function deleteBodyPart(userId, bodyPart) {
  const currentParts = await getBodyParts(userId);
  const newParts = currentParts.filter(part => part !== bodyPart);

  const docRef = doc(db, ...APP_ROOT, userId, 'settings', 'bodyParts');
  await setDoc(docRef, { items: newParts });
  bodyPartsCache.set(userId, newParts);

  return newParts;
}

// Workout Operations
export async function getWorkouts(userId, pageSize = 100) {
  // Check cache first
  if (workoutsCache.has(userId)) {
    return workoutsCache.get(userId);
  }

  const workoutsRef = collection(db, ...APP_ROOT, userId, 'workouts');
  // Limit to 100 most recent workouts to avoid performance issues
  // Note: orderBy on string date won't work correctly with DD-MM-YYYY format,
  // so we fetch with limit and sort in JavaScript
  const q = query(workoutsRef, limit(pageSize));
  const querySnapshot = await getDocs(q);

  const workouts = [];
  querySnapshot.forEach((doc) => {
    workouts.push({ id: doc.id, ...doc.data() });
  });

  // Sort by date (most recent first) - parse DD-MM-YYYY format
  workouts.sort((a, b) => {
    const dateA = parseDateFromStorage(a.date);
    const dateB = parseDateFromStorage(b.date);
    return dateB - dateA;
  });

  workoutsCache.set(userId, workouts);
  return workouts;
}

export async function getWorkoutByDate(userId, dateStr) {
  const docRef = doc(db, ...APP_ROOT, userId, 'workouts', dateStr);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }

  return null;
}

export async function saveWorkout(userId, dateStr, selectedBodyParts, remarks = '') {
  const docRef = doc(db, ...APP_ROOT, userId, 'workouts', dateStr);
  const now = Timestamp.now();

  const existingWorkout = await getDoc(docRef);

  const workoutData = {
    date: dateStr,
    selectedBodyParts,
    remarks,
    updatedAt: now
  };

  if (!existingWorkout.exists()) {
    workoutData.createdAt = now;
  }

  if (selectedBodyParts.length === 0) {
    await deleteDoc(docRef);
    // Clear cache on delete
    workoutsCache.delete(userId);
    return null;
  } else {
    await setDoc(docRef, workoutData, { merge: true });
    // Clear cache on save to ensure fresh data
    workoutsCache.delete(userId);
    // Return the data we just saved instead of fetching again
    return {
      id: dateStr,
      ...workoutData
    };
  }
}

export async function deleteWorkout(userId, dateStr) {
  const docRef = doc(db, ...APP_ROOT, userId, 'workouts', dateStr);
  await deleteDoc(docRef);
  // Clear cache on delete
  workoutsCache.delete(userId);
}

// Get workouts for a selected month. Fetch the complete collection so month
// navigation is not limited to the 100 records used by the detailed view.
export async function getWorkoutsForMonth(userId, year, month) {
  const workoutsRef = collection(db, ...APP_ROOT, userId, 'workouts');
  const querySnapshot = await getDocs(workoutsRef);
  const workouts = [];

  querySnapshot.forEach((workoutDoc) => {
    workouts.push({ id: workoutDoc.id, ...workoutDoc.data() });
  });

  // Date format is DD-MM-YYYY, so we filter by the month-year suffix
  // e.g., June 2026 would have dates like 01-06-2026, 15-06-2026
  const monthStr = String(month + 1).padStart(2, '0');
  const yearStr = String(year);
  const suffix = `-${monthStr}-${yearStr}`;

  return workouts.filter(w => w.date && w.date.endsWith(suffix));
}

// Helper to format date to DD-MM-YYYY format for storage
export function formatDateForStorage(date) {
  return format(date, 'dd-MM-yyyy');
}

// Helper to parse date from DD-MM-YYYY format
export function parseDateFromStorage(dateStr) {
  if (!dateStr) return new Date(0);
  const [day, month, year] = dateStr.split('-');
  return new Date(year, month - 1, day);
}

// Clear caches on logout
export function clearCache() {
  bodyPartsCache.clear();
  workoutsCache.clear();
}
