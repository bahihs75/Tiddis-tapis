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
        if (err.code === 'auth/operation-not-allowed') {
            errorEl.textContent = 'Error: Email/Password sign-in is NOT enabled in Firebase Console.';
        } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
            errorEl.textContent = 'Incorrect email or password.';
        } else {
            errorEl.textContent = `Error: ${err.code || err.message}`;
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
