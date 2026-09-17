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

// IMPORTANT: Force HTTP Long Polling instead of WebSockets.
// College networks (like Amrita) often aggressively block standard WSS ports,
// causing the Firebase SDK to hang infinitely pending connection.
db.settings({
    experimentalForceLongPolling: true,
    experimentalAutoDetectLongPolling: false,
    merge: true
});

let offlinePersistenceEnabled = false;
