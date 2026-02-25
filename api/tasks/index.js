import clientPromise from '../../lib/mongodb.js';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
    const client = await clientPromise;
    const db = client.db('missioncontrol');
    const collection = db.collection('tasks');

    if (req.method === 'GET') {
        try {
            // Find all tasks, convert _id back to id for the frontend
            const tasks = await collection.find({}).toArray();
            const formattedTasks = tasks.map(t => {
                const { _id, ...rest } = t;
                return { id: _id.toString(), ...rest };
            });
            return res.status(200).json({ ok: true, tasks: formattedTasks });
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message });
        }
    }

    if (req.method === 'POST') {
        try {
            const { title, description, column, priority, dueDate, assignee, source } = req.body;
            if (!title) {
                return res.status(400).json({ ok: false, error: 'Title is required' });
            }

            const newTask = {
                title,
                description: description || '',
                column: column || 'todo',
                priority: priority || 'medium',
                dueDate: dueDate || null,
                assignee: assignee || null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                source: source || null,
            };

            const result = await collection.insertOne(newTask);

            return res.status(201).json({
                ok: true,
                task: { id: result.insertedId.toString(), ...newTask }
            });
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message });
        }
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
