import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const password = req.headers["x-viewer-password"];
  if (!password || password !== process.env.VIEWER_PASSWORD) {
    return res.status(401).json({ error: "Invalid password" });
  }

  const deviceKeys = (await kv.smembers("device_keys")) || [];
  if (deviceKeys.length === 0) {
    return res.status(200).json({ devices: [] });
  }

  const records = await Promise.all(deviceKeys.map((key) => kv.get(key)));
  const devices = records.filter(Boolean);

  return res.status(200).json({ devices });
}
