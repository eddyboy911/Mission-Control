import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    // Optional Admin Key protection (matches roadmap request)
    if (process.env.AGENT_API_KEY && req.headers.authorization !== `Bearer ${process.env.AGENT_API_KEY}`) {
        return res.status(401).json({ ok: false, error: 'Unauthorized: Invalid or missing API Key' });
    }

    try {
        const { source, message, tasks, calendar, data } = req.body;

        if (!message && !tasks && !calendar && !data) {
            return res.status(400).json({ ok: false, error: 'Empty update: provide message, tasks, calendar, or data' });
        }

        const client = await clientPromise;
        const db = client.db('missioncontrol');
        const tasksCollection = db.collection('tasks');
        const calCollection = db.collection('calendar');
        const agentsCollection = db.collection('agent_logs');

        const results = { tasksCreated: 0, calendarCreated: 0 };
        const createdAt = new Date().toISOString();

        // 1. Process Tasks
        if (Array.isArray(tasks) && tasks.length > 0) {
            const newTasks = tasks.map(t => ({
                title: t.title,
                description: t.description || '',
                column: t.column || 'todo',
                priority: t.priority || 'medium',
                dueDate: t.dueDate || null,
                assignee: t.assignee || null,
                source: source || 'unknown',
                createdAt,
                updatedAt: createdAt
            }));
            const tkRes = await tasksCollection.insertMany(newTasks);
            results.tasksCreated = tkRes.insertedCount;
        }

        // 2. Process Calendar
        if (Array.isArray(calendar) && calendar.length > 0) {
            const newCal = calendar.map(c => ({
                date: c.date,
                title: c.title,
                description: c.description || '',
                type: c.type || 'event',
                source: source || 'unknown',
                createdAt
            }));
            const clRes = await calCollection.insertMany(newCal);
            results.calendarCreated = clRes.insertedCount;
        }

        // 3. Log the agent update itself
        const logEntry = {
            source: source || 'unknown',
            message: message || null,
            data: data || null,
            results,
            createdAt
        };

        const agRes = await agentsCollection.insertOne(logEntry);

        // Keep only the latest 200 entries (capped logic simulating the old file-based cleanup)
        const count = await agentsCollection.countDocuments();
        if (count > 200) {
            const oldestLogs = await agentsCollection.find().sort({ createdAt: 1 }).limit(count - 200).toArray();
            const oldestIds = oldestLogs.map(log => log._id);
            await agentsCollection.deleteMany({ _id: { $in: oldestIds } });
        }

        return res.status(201).json({
            ok: true,
            entry: { id: agRes.insertedId.toString(), ...logEntry }
        });

    } catch (e) {
        return res.status(500).json({ ok: false, error: e.message });
    }
}
