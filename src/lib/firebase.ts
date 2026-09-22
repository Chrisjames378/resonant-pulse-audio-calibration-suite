import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc,
  doc,
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err: any) {
    console.warn('Google sign-in popup error:', err);
    throw err;
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export function subscribeAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export interface SavedCalibrationDoc {
  id?: string;
  userId: string;
  profileName: string;
  deviceType: string;
  eqMatrix: Array<{ freq: number; gain: number }>;
  detectedAcousticIssues?: string[];
  createdAt?: any;
}

export interface EQPresetDoc {
  id?: string;
  userId: string;
  presetName: string;
  deviceType: string;
  roomName?: string;
  description?: string;
  eqMatrix: Array<{ freq: number; gain: number }>;
  isFavorite?: boolean;
  createdAt?: any;
}

// LocalStorage fallback key helper
const LOCAL_STORAGE_KEY = 'resonant_pulse_saved_profiles';
const PRESETS_STORAGE_KEY = 'resonant_pulse_saved_presets';

function getLocalProfiles(): SavedCalibrationDoc[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalProfile(docItem: SavedCalibrationDoc) {
  try {
    const existing = getLocalProfiles();
    const updated = [docItem, ...existing.filter(p => p.id !== docItem.id)];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('LocalStorage save warning:', e);
  }
}

function getLocalPresets(): EQPresetDoc[] {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalPreset(docItem: EQPresetDoc) {
  try {
    const existing = getLocalPresets();
    const updated = [docItem, ...existing.filter(p => p.id !== docItem.id)];
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('LocalStorage save preset warning:', e);
  }
}

export async function saveProfileToFirestore(data: Omit<SavedCalibrationDoc, 'id'>): Promise<string> {
  const localId = `local_${Date.now()}`;
  const docToSave: SavedCalibrationDoc = {
    ...data,
    id: localId,
    createdAt: new Date().toISOString()
  };

  try {
    const colRef = collection(db, 'calibrationProfiles');
    const docRef = await addDoc(colRef, {
      ...data,
      createdAt: serverTimestamp(),
    });
    docToSave.id = docRef.id;
    saveLocalProfile(docToSave);
    return docRef.id;
  } catch (err) {
    console.warn('Firestore offline/error, saved profile locally:', err);
    saveLocalProfile(docToSave);
    return localId;
  }
}

export async function getProfilesFromFirestore(userId: string): Promise<SavedCalibrationDoc[]> {
  const localProfiles = getLocalProfiles().filter(p => p.userId === userId);
  
  try {
    const colRef = collection(db, 'calibrationProfiles');
    const q = query(colRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const remoteResults: SavedCalibrationDoc[] = [];
    querySnapshot.forEach((docSnap) => {
      remoteResults.push({ id: docSnap.id, ...docSnap.data() } as SavedCalibrationDoc);
    });

    if (remoteResults.length > 0) {
      return remoteResults;
    }
  } catch (err) {
    console.warn('Firestore fetch failed, returning local storage profiles:', err);
  }

  return localProfiles;
}

export async function savePresetToFirestore(data: Omit<EQPresetDoc, 'id'>): Promise<string> {
  const localId = `preset_local_${Date.now()}`;
  const presetToSave: EQPresetDoc = {
    ...data,
    id: localId,
    createdAt: new Date().toISOString()
  };

  try {
    const colRef = collection(db, 'eqPresets');
    const docRef = await addDoc(colRef, {
      ...data,
      createdAt: serverTimestamp(),
    });
    presetToSave.id = docRef.id;
    saveLocalPreset(presetToSave);
    return docRef.id;
  } catch (err) {
    console.warn('Firestore offline/error, saved preset locally:', err);
    saveLocalPreset(presetToSave);
    return localId;
  }
}

export async function getPresetsFromFirestore(userId: string): Promise<EQPresetDoc[]> {
  const localPresets = getLocalPresets().filter(p => p.userId === userId);
  
  try {
    const colRef = collection(db, 'eqPresets');
    const q = query(colRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const remoteResults: EQPresetDoc[] = [];
    querySnapshot.forEach((docSnap) => {
      remoteResults.push({ id: docSnap.id, ...docSnap.data() } as EQPresetDoc);
    });

    if (remoteResults.length > 0) {
      return remoteResults;
    }
  } catch (err) {
    console.warn('Firestore fetch failed for presets, returning local presets:', err);
  }

  return localPresets;
}

export async function deletePresetFromFirestore(presetId: string): Promise<void> {
  try {
    const existing = getLocalPresets().filter(p => p.id !== presetId);
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(existing));

    if (!presetId.startsWith('preset_local_')) {
      await deleteDoc(doc(db, 'eqPresets', presetId));
    }
  } catch (err) {
    console.warn('Error deleting preset:', err);
  }
}
