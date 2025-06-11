// src/firebase.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAbpvtNrGPesgCoJmEETJiVXMirLfkrBAM",
  authDomain: "joii-aims.firebaseapp.com",
  projectId: "joii-aims",
  storageBucket: "joii-aims.appspot.com", // ✅ Correct domain
  messagingSenderId: "713503499928",
  appId: "1:713503499928:web:8353ae848f46136a8052ed",
  measurementId: "G-S0H2SGWYYH",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
