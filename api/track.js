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
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { requestId } = req.query;
        if (!requestId) return res.status(400).json({ error: 'Missing requestId' });

        const doc = await db.collection('requests').doc(requestId).get();
        if (doc.exists) {
            const d = doc.data();
            return res.status(200).json({
                found: true,
                req: d,
                position: d.status === 'queued' ? 'in queue' : 'resolved'
            });
        }
        
        return res.status(200).json({ found: false });
    } catch (error) {
        console.error('[API Proxy] Track error:', error);
        return res.status(500).json({ error: error.message });
    }
}