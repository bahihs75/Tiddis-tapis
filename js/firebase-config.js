import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDNcZdZWcA-7czcgeETGoZ5soKYi4Nj_LY",
  authDomain: "tiddis-tapis.firebaseapp.com",
  projectId: "tiddis-tapis",
  storageBucket: "tiddis-tapis.firebasestorage.app",
  messagingSenderId: "406600031805",
  appId: "1:406600031805:web:dc40d38e83c39dd70c5454",
  measurementId: "G-42NNKY6M3G"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
