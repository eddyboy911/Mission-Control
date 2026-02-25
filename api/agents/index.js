import clientPromise from '../../lib/mongodb.js';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
    const client = await clientPromise;
    const db = client.db('missioncontrol');
    const collection = db.collection('agents');

    // ── GET /api/agents ──────────────────────────────────────────────
    if (req.method === 'GET') {
        try {
            const agents = await collection.find({}).sort({ createdAt: 1 }).toArray();
            const formatted = agents.map(a => {
                const { _id, ...rest } = a;
                return { id: _id.toString(), ...rest };
            });
            return res.status(200).json({ ok: true, agents: formatted });
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message });
        }
    }

    // ── POST /api/agents ─────────────────────────────────────────────
    if (req.method === 'POST') {
        try {
            const { name, role, description, source } = req.body;

            if (!name) return res.status(400).json({ ok: false, error: 'Agent name is required' });

            const validRoles = ['orchestrator', 'primary', 'sub-agent'];
            const agentRole = validRoles.includes(role) ? role : 'sub-agent';

            // Prevent duplicate names
            const existing = await collection.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
            if (existing) {
                // If already exists, just update lastSeen and return it (idempotent self-registration)
                const updated = await collection.findOneAndUpdate(
                    { _id: existing._id },
                    { $set: { lastSeen: new Date().toISOString() } },
                    { returnDocument: 'after' }
                );
                const { _id, ...rest } = updated;
                return res.status(200).json({ ok: true, agent: { id: _id.toString(), ...rest }, alreadyExists: true });
            }

            const newAgent = {
                name,
                role: agentRole,
                description: description || '',
                source: source || null,
                status: 'active',
                createdAt: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
            };

            const result = await collection.insertOne(newAgent);
            return res.status(201).json({
                ok: true,
                agent: { id: result.insertedId.toString(), ...newAgent }
            });
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message });
        }
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
