export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method === 'GET') return res.status(200).json({ status: 'ok', name: 'KrdDown Proxy', version: '2.0.0' });
    if (req.method === 'POST') {
        try {
            const { url } = req.body;
            if (!url) return res.status(400).json({ error: 'URL required' });
            const r = await fetch('https://api.cobalt.tools/api/json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ url, vQuality: '1080', filenamePattern: 'pretty', isNoTTWatermark: true })
            });
            return res.status(200).json(await r.json());
        } catch (e) { return res.status(500).json({ status: 'error', message: e.message }); }
    }
    return res.status(405).json({ error: 'Method not allowed' });
}
