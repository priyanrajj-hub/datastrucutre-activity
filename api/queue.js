const firebase = require('firebase/compat/app');
require('firebase/compat/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyCalmpX4wgiyxkPzbuW5l0vQKjPjZEQKNI",
    authDomain: "helpdesk-queue-b62d1.firebaseapp.com",
    projectId: "helpdesk-queue-b62d1",
    storageBucket: "helpdesk-queue-b62d1.firebasestorage.app",
    messagingSenderId: "722695771880",
    appId: "1:722695771880:web:b6680534f1db00a35fdb5d"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const snapshot = await db.collection('requests')
            .where('status', '==', 'queued')
            .orderBy('createdAt', 'asc')
            .get();

        const docs = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Convert serverTimestamp to ISO string if possible for clean JSON transfer
            if (data.createdAt && typeof data.createdAt.toDate === 'function') {
                data.createdAt = data.createdAt.toDate().toISOString();
            }
            docs.push({ id: doc.id, ...data });
        });

        return res.status(200).json({ ok: true, docs });
    } catch (error) {
        console.error('[API Proxy] Firestore error:', error);
        return res.status(500).json({ error: error.message, code: error.code });
    }
}