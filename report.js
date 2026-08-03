import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { device_name, token, lat, lng, wifi, timestamp } = req.body || {};

  if (!token || token !== process.env.AGENT_TOKEN) {
    return res.status(401).json({ error: "Invalid token" });
  }
  if (!device_name || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const record = {
    name: device_name,
    lat,
    lng,
    wifi: wifi || null,
    timestamp: timestamp || Math.floor(Date.now() / 1000),
  };

  // Key each device by its name (simple + human readable)
  const deviceKey = `device:${device_name}`;
  await kv.set(deviceKey, record);

  // Keep a set of all known device keys so /api/devices can list them
  await kv.sadd("device_keys", deviceKey);

  return res.status(200).json({ ok: true });
}
