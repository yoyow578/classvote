import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: 請將下方的設定替換為您自己的 Firebase Project Config
// 您可以在 Firebase Console -> Project Settings -> General -> Your apps 找到
const firebaseConfig = {
  apiKey: "AIzaSyAam5iqLJDb4TQJ_KXMcXpJdbd0leNNCE0",
  authDomain: "vote-9468a.firebaseapp.com",
  projectId: "vote-9468a",
  storageBucket: "vote-9468a.firebasestorage.app",
  messagingSenderId: "125697069340",
  appId: "1:125697069340:web:872b77a367b9f473596ad9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
