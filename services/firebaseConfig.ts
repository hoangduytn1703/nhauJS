import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Config từ Firebase Console Project `nhaujs`
const firebaseConfig = {
  apiKey: "AIzaSyDkhU4BOsIGm7ANL4cmMrBQsB3dhsKFuzo",
  authDomain: "nhaujs.firebaseapp.com",
  projectId: "nhaujs",
  storageBucket: "nhaujs.firebasestorage.app",
  messagingSenderId: "985249836242",
  appId: "1:985249836242:web:5f0d199f6df33af4b0d10b",
  measurementId: "G-Q6G33D5B9C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);