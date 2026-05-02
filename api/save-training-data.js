const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

if (!admin.apps.length) {
    try {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY
            ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
            : undefined;

        if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
            throw new Error('Missing required Firebase environment variables.');
        }

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
    } catch (error) {
        console.error('Firebase admin initialization error:', error.message);
        if (error.code !== 'app/duplicate-app') {
            throw error;
        }
    }
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { phase, image, lines, stats, timestamp } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'Missing image data' });
        }

        // 1. Save Image to Storage
        const uuid = uuidv4();
        const fileName = `training_images/${uuid}.jpg`;
        const file = bucket.file(fileName);
        
        // Remove base64 header
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        await file.save(buffer, {
            metadata: { contentType: 'image/jpeg' },
            public: true
        });

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        // 2. Save Metadata to Firestore (Compatible with IntelligenceService)
        await db.collection('analyses').add({
            uuid,
            phase,
            imageUrl: publicUrl,
            storagePath: fileName,
            results: {
                landmarks: lines,
                stats: stats
            },
            features: {
                // 将来的にサーバー側でハッシュ計算も可能だが、現在はフロントから送信されたデータ構造を維持
                visualHash: null 
            },
            clientTimestamp: timestamp,
            serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
            platform: "web-v1-training-data"
        });

        return res.status(200).json({ success: true, uuid });

    } catch (error) {
        console.error('Error saving training data:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};
