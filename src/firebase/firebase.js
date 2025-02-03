import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDGQVOYVxGDGDYrUEUPwlHbNXEVEtaOZSU",
  authDomain: "soulmagle.firebaseapp.com",
  projectId: "soulmagle",
  storageBucket: "soulmagle.appspot.com",
  messagingSenderId: "1098332029348",
  appId: "1:1098332029348:web:c7c7e6d6d4e8c2b9b9b9b9"
};

// Initialize Firebase only if it hasn't been initialized already
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Get Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app; 