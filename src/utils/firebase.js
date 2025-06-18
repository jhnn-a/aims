import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAbpvtNrGPesgCoJmEETJiVXMirLfkrBAM",
  authDomain: "joii-aims.firebaseapp.com",
  projectId: "joii-aims",
  storageBucket: "joii-aims.appspot.com",
  messagingSenderId: "713503499928",
  appId: "1:713503499928:web:8353ae848f46136a8052ed",
  measurementId: "G-S0H2SGWYYH",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
