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

// In Node environments, firestore uses grpc automatically.
const db = firebase.firestore();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { requestId, docData } = req.body;
        
        if (!requestId || !docData) {
            return res.status(400).json({ error: 'Missing requestId or docData' });
        }

        // We must re-evaluate the serverTimestamp because JSON stringification destroys the FieldValue object
        docData.createdAt = firebase.firestore.FieldValue.serverTimestamp();

        await db.collection('requests').doc(requestId).set(docData);
        
        return res.status(200).json({ ok: true, requestId });
    } catch (error) {
        console.error('[API Proxy] Firestore error:', error);
        return res.status(500).json({ error: error.message, code: error.code });
    }
}