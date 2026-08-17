// ============================================
// TIDDIS TAPIS — Admin Authentication Guard
// حماية لوحة التحكم عبر Firebase Authentication
// ============================================

import { auth } from "./firebase-config.js";
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const loginScreen = document.getElementById('admin-login-screen');
const adminApp = document.getElementById('admin-app');
const loginForm = document.getElementById('admin-login-form');
const emailInput = document.getElementById('admin-login-email');
const passwordInput = document.getElementById('admin-login-password');
const submitBtn = document.getElementById('admin-login-submit');
const errorEl = document.getElementById('admin-login-error');
const currentEmailEl = document.getElementById('admin-current-email');
const signOutBtn = document.getElementById('admin-sign-out-btn');

// إظهار/إخفاء الشاشات حسب حالة تسجيل الدخول
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginScreen.style.display = 'none';
        adminApp.style.display = '';
        if (currentEmailEl) currentEmailEl.textContent = user.email;
    } else {
        loginScreen.style.display = 'flex';
        adminApp.style.display = 'none';
    }
});

// تسجيل الدخول
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'SIGNING IN...';

    try {
        await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
        passwordInput.value = '';
    } catch (err) {
        console.error("Login error:", err);
        // عرض تفاصيل الخطأ بدقة لتسهيل التشخيص والتصحيح
        const code = err.code || 'unknown-error';
        const msg = err.message || '';
        if (code === 'auth/operation-not-allowed') {
            errorEl.textContent = 'Firebase Error: Email/Password sign-in is NOT enabled in Firebase Console -> Authentication -> Sign-in method.';
        } else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
            errorEl.textContent = `Login Failed (${code}): Please ensure user exists in Firebase Console and password is correct.`;
        } else if (code === 'auth/invalid-api-key') {
            errorEl.textContent = 'Firebase Error: Invalid API Key in firebase-config.js.';
        } else {
            errorEl.textContent = `Error [${code}]: ${msg}`;
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'SIGN IN';
    }
});

// تسجيل الخروج
signOutBtn?.addEventListener('click', async () => {
    await signOut(auth);
});
