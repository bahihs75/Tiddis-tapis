// ============================================
// TIDDIS TAPIS — Firebase Configuration
// إعدادات الاتصال بقاعدة بيانات Firebase
// ============================================

// استيراد المكتبات المطلوبة من Firebase CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ============================================
// بيانات التهيئة (تم الحصول عليها من وحدة تحكم Firebase)
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyDNcZdZWcA-7czcgeETGoZ5soKYi4Nj_LY",
    authDomain: "tiddis-tapis.firebaseapp.com",
    projectId: "tiddis-tapis",
    storageBucket: "tiddis-tapis.firebasestorage.app",
    messagingSenderId: "406600031805",
    appId: "1:406600031805:web:dc40d38e83c39dd70c5454",
    measurementId: "G-42NNKY6M3G"
};

// ============================================
// تهيئة تطبيق Firebase وخدمة Firestore
// ============================================
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
