import clientPromise from '../../lib/mongodb.js';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
    const client = await clientPromise;
    const db = client.db('missioncontrol');
    const collection = db.collection('calendar');

    if (req.method === 'GET') {
        try {
            const entries = await collection.find({}).toArray();
            const formattedEntries = entries.map(e => {
                const { _id, ...rest } = e;
                return { id: _id.toString(), ...rest };
            });
            return res.status(200).json({ ok: true, entries: formattedEntries });
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message });
        }
    }

    if (req.method === 'POST') {
        try {
            const payload = Array.isArray(req.body) ? req.body : [req.body];
            const newEntries = [];

            for (const item of payload) {
                if (!item.date || !item.title) {
                    return res.status(400).json({ ok: false, error: 'Date and Title are required' });
                }

                newEntries.push({
                    date: item.date,
                    title: item.title,
                    description: item.description || '',
                    type: item.type || 'event',
                    taskId: item.taskId || null,
                    source: item.source || null,
                    createdAt: new Date().toISOString()
                });
            }

            if (newEntries.length === 0) {
                return res.status(400).json({ ok: false, error: 'No valid entries provided' });
            }

            const result = await collection.insertMany(newEntries);

            const createdEntries = Object.keys(result.insertedIds).map(index => ({
                id: result.insertedIds[index].toString(),
                ...newEntries[index]
            }));

            return res.status(201).json({
                ok: true,
                created: newEntries.length,
                entries: createdEntries
            });
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message });
        }
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
