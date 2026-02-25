export default function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    // A simple status endpoint ensuring Vercel serverless is up
    res.status(200).json({
        ok: true,
        status: 'online',
        version: '2.1.0' // Match upgraded version
    });
}
