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

let adminInitializer = null;

async function loadAdminInitializer() {
    if (adminInitializer) return adminInitializer;
    const adminModule = await import('./admin.js?v=20260818-private-image-sources-v2');
    adminInitializer = adminModule.initAdmin;
    return adminInitializer;
}

// إظهار/إخفاء الشاشات حسب حالة تسجيل الدخول
onAuthStateChanged(auth, async (user) => {
    if (user) {
        loginScreen.style.display = 'none';
        adminApp.style.display = '';
        if (currentEmailEl) currentEmailEl.textContent = user.email;
        resetTiddisIdleTimer();
        try {
            const token = await user.getIdTokenResult();
            sessionStorage.setItem('tiddisAdminRole', String(token.claims.role || 'admin').toLowerCase());
            sessionStorage.setItem('tiddisAdminEmail', user.email || '');
        } catch (error) {
            sessionStorage.setItem('tiddisAdminRole', 'admin');
            sessionStorage.setItem('tiddisAdminEmail', user.email || '');
        }
        
        // تحميل وتهيئة بيانات لوحة التحكم فقط بعد تسجيل الدخول الناجح.
        // إبقاء هذا الاستيراد ديناميكياً يمنع خطأً في admin.js من تعطيل نموذج الدخول.
        try {
            const initAdmin = await loadAdminInitializer();
            await initAdmin();
        } catch (err) {
            console.error("Failed to initialize admin data:", err);
            if (errorEl) errorEl.textContent = 'Admin data could not be loaded. Check Firebase permissions and try again.';
        }
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
            errorEl.innerHTML = `
                <div style="margin-bottom:8px;">Login Failed (${code})</div>
                <div style="font-size:0.7rem; color:#666; line-height:1.4; text-align:left; border-top:1px solid #eee; pt-8;">
                    • Check if user <b>${emailInput.value}</b> is added in Firebase Console > Auth.<br>
                    • Ensure <b>Email/Password</b> provider is enabled.<br>
                    • Check <b>Authorized Domains</b> in Firebase settings if using a new URL.
                </div>
            `;
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


// Governance helpers: claims are read-only on the client and must be assigned server-side.
const TIDDIS_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
let tiddisIdleTimer = null;
function resetTiddisIdleTimer() {
    if (tiddisIdleTimer) clearTimeout(tiddisIdleTimer);
    tiddisIdleTimer = setTimeout(async () => {
        try { await signOut(auth); } catch (error) { console.warn('Idle sign out failed:', error); }
    }, TIDDIS_IDLE_TIMEOUT_MS);
}
['pointerdown', 'keydown', 'touchstart', 'mousemove'].forEach(eventName => {
    window.addEventListener(eventName, resetTiddisIdleTimer, { passive: true });
});
