/**
 * Firebase Configuration — Campus Helpdesk Queue System
 *
 * ═══════════════════════════════════════════════════════
 *  IMPORTANT: Firebase web config values are NOT secret.
 *  Security is enforced via Firestore Security Rules,
 *  NOT by hiding these values. They are safe to commit
 *  to version control and ship in client-side code.
 * ═══════════════════════════════════════════════════════
 *
 * To set up your own Firebase project:
 *   1. Go to https://console.firebase.google.com
 *   2. Create a new project (or use an existing one)
 *   3. Add a Web App in Project Settings
 *   4. Copy the config object below and replace the placeholder values
 *   5. Enable Firestore (Native mode) under Build → Firestore Database
 *   6. Enable Authentication (Email/Password) under Build → Authentication
 *   7. Create one staff user (e.g. teacher@campus.edu) in the Auth console
 */

const firebaseConfig = {
    apiKey: "AIzaSyCalmpX4wgiyxkPzbuW5l0vQKjPjZEQKNI",
    authDomain: "helpdesk-queue-b62d1.firebaseapp.com",
    projectId: "helpdesk-queue-b62d1",
    storageBucket: "helpdesk-queue-b62d1.firebasestorage.app",
    messagingSenderId: "722695771880",
    appId: "1:722695771880:web:b6680534f1db00a35fdb5d",
    measurementId: "G-HPKJSJ6RCE"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export global references used by app.js
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence — if the network drops mid-write,
// Firestore SDK will queue the write locally and retry when reconnected.
// IMPORTANT: This can fail silently in Safari private browsing, older browsers,
// or when multiple tabs are open. We surface the failure visibly.
let offlinePersistenceEnabled = false;
db.enablePersistence({ synchronizeTabs: true })
    .then(() => { offlinePersistenceEnabled = true; })
    .catch(err => {
        offlinePersistenceEnabled = false;
        if (err.code === 'failed-precondition') {
            console.warn('[Helpdesk] Firestore persistence unavailable — multiple tabs open.');
            // Show warning after DOM loads
            document.addEventListener('DOMContentLoaded', () => {
                const t = document.getElementById('toast');
                if (t) {
                    // Use a slight delay so it doesn't conflict with other init toasts
                    setTimeout(() => {
                        const icon = document.getElementById('toast-icon');
                        const text = document.getElementById('toast-text');
                        if (icon) icon.textContent = '⚠️';
                        if (text) text.textContent = 'Offline mode unavailable — multiple tabs detected. Requests require an active connection.';
                        t.className = 'toast error';
                        t.classList.remove('hidden');
                        setTimeout(() => t.classList.add('hidden'), 6000);
                    }, 2000);
                }
            });
        } else if (err.code === 'unimplemented') {
            console.warn('[Helpdesk] Firestore persistence not supported in this browser.');
            document.addEventListener('DOMContentLoaded', () => {
                const t = document.getElementById('toast');
                if (t) {
                    setTimeout(() => {
                        const icon = document.getElementById('toast-icon');
                        const text = document.getElementById('toast-text');
                        if (icon) icon.textContent = '⚠️';
                        if (text) text.textContent = 'Offline mode not supported in this browser. Requests require an active connection.';
                        t.className = 'toast error';
                        t.classList.remove('hidden');
                        setTimeout(() => t.classList.add('hidden'), 6000);
                    }, 2000);
                }
            });
        }
    });

