import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
   apiKey: "AIzaSyAOmNStFUmwZNkjuZc9VBGtJMfDEgBubHk",
  authDomain: "studygears-55c4c.firebaseapp.com",
  databaseURL: "https://studygears-55c4c-default-rtdb.firebaseio.com",
  projectId: "studygears-55c4c",
  storageBucket: "studygears-55c4c.firebasestorage.app",
  messagingSenderId: "333304376609",
  appId: "1:333304376609:web:5907f55bba9d12c723a260",
  measurementId: "G-R3XHCKMEWP"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);