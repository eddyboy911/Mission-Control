import clientPromise from '../../../lib/mongodb.js';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
    const { id } = req.query;
    const client = await clientPromise;
    const db = client.db('missioncontrol');
    const collection = db.collection('tasks');

    let objectId;
    try {
        objectId = new ObjectId(id);
    } catch (e) {
        return res.status(400).json({ ok: false, error: 'Invalid Task ID format' });
    }

    if (req.method === 'PATCH') {
        try {
            const allowedUpdates = ['title', 'description', 'column', 'priority', 'dueDate', 'assignee', 'order', 'subtasks', 'labels', 'status'];
            const updates = {};

            for (const key of allowedUpdates) {
                if (req.body[key] !== undefined) {
                    updates[key] = req.body[key];
                }
            }

            updates.updatedAt = new Date().toISOString();

            const result = await collection.findOneAndUpdate(
                { _id: objectId },
                { $set: updates },
                { returnDocument: 'after' }
            );

            if (!result) {
                return res.status(404).json({ ok: false, error: 'Task not found' });
            }

            const { _id, ...rest } = result;
            return res.status(200).json({ ok: true, task: { id: _id.toString(), ...rest } });
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message });
        }
    }

    if (req.method === 'DELETE') {
        try {
            const result = await collection.deleteOne({ _id: objectId });
            if (result.deletedCount === 0) {
                return res.status(404).json({ ok: false, error: 'Task not found' });
            }
            return res.status(200).json({ ok: true, deleted: id });
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message });
        }
    }

    res.setHeader('Allow', ['PATCH', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
