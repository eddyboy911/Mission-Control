import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const limit = parseInt(req.query.limit, 10) || 50;
        const client = await clientPromise;
        const db = client.db('missioncontrol');
        const collection = db.collection('agent_logs');

        const total = await collection.countDocuments();

        // Sort newest first
        const entries = await collection.find({}).sort({ createdAt: -1 }).limit(limit).toArray();

        const formattedEntries = entries.map(e => {
            const { _id, ...rest } = e;
            return { id: _id.toString(), ...rest };
        });

        return res.status(200).json({ ok: true, entries: formattedEntries, total });
    } catch (e) {
        return res.status(500).json({ ok: false, error: e.message });
    }
}
