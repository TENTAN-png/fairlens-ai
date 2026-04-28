import { db } from './firebase';
import {
  collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp
} from 'firebase/firestore';

const COLLECTION = 'audits';
const LOCAL_KEY = 'fairlens_audit_history';

// ---- Firestore operations ----

let firestoreAvailable = null;

async function checkFirestore() {
  if (firestoreAvailable !== null) return firestoreAvailable;
  try {
    await getDocs(query(collection(db, COLLECTION), orderBy('savedAt', 'desc')));
    firestoreAvailable = true;
  } catch {
    firestoreAvailable = false;
  }
  return firestoreAvailable;
}

// ---- LocalStorage fallback ----

function getLocalHistory() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalHistory(history) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(history));
}

// ---- Public API ----

/**
 * Save an audit result (tries Firestore, falls back to localStorage)
 */
export async function saveAudit(audit) {
  const entry = {
    ...audit,
    id: Date.now().toString(),
    savedAt: new Date().toISOString()
  };

  // Try Firestore
  const available = await checkFirestore();
  if (available) {
    try {
      const docRef = await addDoc(collection(db, COLLECTION), {
        ...entry,
        savedAt: serverTimestamp()
      });
      entry.firestoreId = docRef.id;
    } catch (err) {
      console.warn('Firestore save failed, using localStorage:', err.message);
    }
  }

  // Always also save to localStorage as backup
  const history = getLocalHistory();
  history.unshift(entry);
  if (history.length > 50) history.pop();
  saveLocalHistory(history);

  return entry;
}

/**
 * Get audit history (tries Firestore, falls back to localStorage)
 */
export async function getHistoryAsync() {
  const available = await checkFirestore();
  if (available) {
    try {
      const q = query(collection(db, COLLECTION), orderBy('savedAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ ...d.data(), firestoreId: d.id }));
    } catch (err) {
      console.warn('Firestore read failed, using localStorage:', err.message);
    }
  }
  return getLocalHistory();
}

/**
 * Synchronous get (localStorage only — for initial render)
 */
export function getHistory() {
  return getLocalHistory();
}

/**
 * Delete an audit by id
 */
export async function deleteAuditAsync(id) {
  // Delete from Firestore
  const available = await checkFirestore();
  if (available) {
    try {
      const snapshot = await getDocs(collection(db, COLLECTION));
      const match = snapshot.docs.find(d => d.data().id === id);
      if (match) await deleteDoc(doc(db, COLLECTION, match.id));
    } catch (err) {
      console.warn('Firestore delete failed:', err.message);
    }
  }

  // Delete from localStorage
  const history = getLocalHistory().filter(a => a.id !== id);
  saveLocalHistory(history);
  return history;
}

/**
 * Synchronous delete (localStorage only)
 */
export function deleteAudit(id) {
  const history = getLocalHistory().filter(a => a.id !== id);
  saveLocalHistory(history);
  return history;
}

/**
 * Clear all history
 */
export async function clearHistoryAsync() {
  const available = await checkFirestore();
  if (available) {
    try {
      const snapshot = await getDocs(collection(db, COLLECTION));
      const deletes = snapshot.docs.map(d => deleteDoc(doc(db, COLLECTION, d.id)));
      await Promise.all(deletes);
    } catch (err) {
      console.warn('Firestore clear failed:', err.message);
    }
  }
  saveLocalHistory([]);
  return [];
}

export function clearHistory() {
  saveLocalHistory([]);
  return [];
}
