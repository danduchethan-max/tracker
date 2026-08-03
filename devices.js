import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { password } = req.query;

  if (!password || password !== process.env.VIEWER_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const keys = await kv.keys('device:*');

  if (!keys || keys.length === 0) return res.status(200).json([]);

  const devices = await Promise.all(keys.map((key) => kv.get(key)));

  return res.status(200).json(devices.filter(Boolean));
}
