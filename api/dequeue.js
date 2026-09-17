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
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        if (!auth.currentUser) {
            if (!authPromise) {
                authPromise = auth.signInWithEmailAndPassword('staff@amrita.edu', 'helpdesk2024');
            }
            await authPromise;
        }

        const { requestId } = req.body;
        if (!requestId) return res.status(400).json({ error: 'Missing requestId' });

        await db.collection('requests').doc(requestId).update({
            status: 'resolved',
            resolvedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        return res.status(200).json({ ok: true, requestId });
    } catch (error) {
        console.error('[API Proxy] Dequeue error:', error);
        authPromise = null; 
        return res.status(500).json({ error: error.message });
    }
}