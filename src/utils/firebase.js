import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyBIexq8U-dHuEL0ufxmEBD-sS7SUbj1PMg",
  authDomain: "fairlens-ai-8d166.firebaseapp.com",
  projectId: "fairlens-ai-8d166",
  storageBucket: "fairlens-ai-8d166.firebasestorage.app",
  messagingSenderId: "852188872598",
  appId: "1:852188872598:web:25e90f8889cab32d3ae7b7",
  measurementId: "G-RBN8RNR8HX"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (e) {}
export { analytics };

export default app;
