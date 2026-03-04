import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyD39HCA5zfcKgRjRG09PwJkCZ-x-wt_rhI",
  authDomain: "test-server-48f39.firebaseapp.com",
  databaseURL: "https://test-server-48f39-default-rtdb.firebaseio.com",
  projectId: "test-server-48f39",
  storageBucket: "test-server-48f39.firebasestorage.app",
  messagingSenderId: "199861287355",
  appId: "1:199861287355:web:93fe9e5514da7e8bd96c9e",
  measurementId: "G-31QW7R509M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const database = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
