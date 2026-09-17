const firebase = require('firebase/compat/app');
require('firebase/compat/firestore');
require('firebase/compat/auth');

const firebaseConfig = {
    apiKey: "AIzaSyCalmpX4wgiyxkPzbuW5l0vQKjPjZEQKNI",
    authDomain: "helpdesk-queue-b62d1.firebaseapp.com",
    projectId: "helpdesk-queue-b62d1",
    storageBucket: "helpdesk-queue-b62d1.firebasestorage.app",
    messagingSenderId: "722695771880",
    appId: "1:722695771880:web:b6680534f1db00a35fdb5d"
};

let app;
if (!firebase.apps.length) {
    app = firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

let authPromise = null;

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // Cache the anonymous authentication globally across Vercel lambda warm-starts
        // This avoids hammering the Firebase Auth API and triggering rate limits.
        if (!auth.currentUser) {
            if (!authPromise) {
                authPromise = auth.signInAnonymously();
            }
            await authPromise;
        }

        const snapshot = await db.collection('requests').get();

        let docs = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.createdAt && typeof data.createdAt.toDate === 'function') {
                data.createdAt = data.createdAt.toDate().toISOString();
            }
            docs.push({ id: doc.id, ...data });
        });

        docs = docs
            .filter(d => d.status === 'queued')
            .sort((a, b) => {
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return timeA - timeB;
            });

        return res.status(200).json({ ok: true, docs });
    } catch (error) {
        console.error('[API Proxy] Firestore error:', error);
        authPromise = null; // Reset on failure
        return res.status(500).json({ error: error.message, code: error.code });
    }
}