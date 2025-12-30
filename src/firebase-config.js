import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// PASTE YOUR CONFIG HERE FROM FIREBASE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyBwN4Cy5y47VwIET0dxCl4M5u-NC7n1A_U",
  authDomain: "baldigambar-erp.firebaseapp.com",
  databaseURL: "https://baldigambar-erp-default-rtdb.firebaseio.com",
  projectId: "baldigambar-erp",
  storageBucket: "baldigambar-erp.firebasestorage.app",
  messagingSenderId: "423234325064",
  appId: "1:423234325064:web:9da06e005b6aa13839267d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);