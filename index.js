import { useState, useEffect, useCallback } from 'react';

const ACTIVE_THRESHOLD_SECONDS = 5 * 60; // 5 minutes

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // metres
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(metres) {
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

function timeAgo(ts) {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function isActive(ts) {
  return Math.floor(Date.now() / 1000) - ts < ACTIVE_THRESHOLD_SECONDS;
}

export default function Home() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState('');
  const [devices, setDevices] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' | 'active'
  const [selected, setSelected] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchDevices = useCallback(async (pw) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/devices?password=${encodeURIComponent(pw)}`);
      if (res.status === 401) {
        setAuthError('Wrong password.');
        setAuthed(false);
        return;
      }
      const data = await res.json();
      setDevices(data);
      setAuthed(true);
      setAuthError('');
    } catch {
      setAuthError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    await fetchDevices(password);
  };

  useEffect(() => {
    if (!authed) return;
    // Ask for phone location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation(null)
      );
    }
    // Auto-refresh every 30s
    const interval = setInterval(() => fetchDevices(password), 30000);
    return () => clearInterval(interval);
  }, [authed, password, fetchDevices]);

  const displayed = devices.filter((d) =>
    filter === 'active' ? isActive(d.timestamp) : true
  );
  const activeCount = devices.filter((d) => isActive(d.timestamp)).length;

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={styles.center}>
        <div style={styles.card}>
          <h1 style={styles.title}>📍 Laptop Tracker</h1>
          <form onSubmit={handleLogin} style={styles.form}>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              autoFocus
            />
            <button type="submit" style={styles.btn} disabled={loading}>
              {loading ? 'Checking…' : 'Unlock'}
            </button>
          </form>
          {authError && <p style={styles.error}>{authError}</p>}
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <h1 style={styles.title}>📍 Laptop Tracker</h1>

      {/* Stats */}
      <div style={styles.statsRow}>
        <div style={styles.statBox}>
          <span style={styles.statNum}>{devices.length}</span>
          <span style={styles.statLabel}>Total</span>
        </div>
        <div style={styles.statBox}>
          <span style={{ ...styles.statNum, color: '#22c55e' }}>{activeCount}</span>
          <span style={styles.statLabel}>Active</span>
        </div>
      </div>

      {/* Filter toggle */}
      <div style={styles.toggleRow}>
        {['all', 'active'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{ ...styles.toggleBtn, ...(filter === f ? styles.toggleActive : {}) }}
          >
            {f === 'all' ? 'All Devices' : 'Active Only'}
          </button>
        ))}
      </div>

      {/* Device list */}
      {displayed.length === 0 ? (
        <p style={styles.empty}>No devices found.</p>
      ) : (
        displayed.map((d) => {
          const active = isActive(d.timestamp);
          const dist =
            userLocation
              ? haversineDistance(userLocation.lat, userLocation.lng, d.lat, d.lng)
              : null;
          const open = selected === d.device_name;

          return (
            <div
              key={d.device_name}
              style={{ ...styles.deviceCard, ...(open ? styles.deviceCardOpen : {}) }}
              onClick={() => setSelected(open ? null : d.device_name)}
            >
              <div style={styles.deviceHeader}>
                <span style={{ ...styles.dot, background: active ? '#22c55e' : '#6b7280' }} />
                <span style={styles.deviceName}>{d.device_name}</span>
                <span style={styles.timeAgo}>{timeAgo(d.timestamp)}</span>
              </div>

              {open && (
                <div style={styles.deviceDetails}>
                  <Detail label="Coordinates" value={`${d.lat.toFixed(5)}, ${d.lng.toFixed(5)}`} />
                  <Detail label="Wi-Fi" value={d.wifi || '—'} />
                  <Detail label="Last seen" value={new Date(d.timestamp * 1000).toLocaleString()} />
                  {dist !== null && (
                    <Detail label="Distance from you" value={formatDistance(dist)} />
                  )}
                  <a
                    href={`https://maps.google.com/?q=${d.lat},${d.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.mapLink}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Open in Google Maps ↗
                  </a>
                </div>
              )}
            </div>
          );
        })
      )}

      <p style={styles.footer}>Refreshes every 30s</p>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailLabel}>{label}</span>
      <span style={styles.detailValue}>{value}</span>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = {
  center: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' },
  page: { maxWidth: 480, margin: '0 auto', padding: '24px 16px', background: '#0f172a', minHeight: '100vh', color: '#f1f5f9' },
  card: { background: '#1e293b', borderRadius: 16, padding: 32, width: '100%', maxWidth: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 20, textAlign: 'center', color: '#f1f5f9' },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: { padding: '12px 16px', borderRadius: 10, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 16, outline: 'none' },
  btn: { padding: '12px', borderRadius: 10, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' },
  error: { color: '#f87171', marginTop: 8, textAlign: 'center', fontSize: 14 },
  statsRow: { display: 'flex', gap: 12, marginBottom: 16 },
  statBox: { flex: 1, background: '#1e293b', borderRadius: 12, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  statNum: { fontSize: 28, fontWeight: 700, color: '#f1f5f9' },
  statLabel: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
  toggleRow: { display: 'flex', gap: 8, marginBottom: 16 },
  toggleBtn: { flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', fontSize: 14, cursor: 'pointer' },
  toggleActive: { background: '#3b82f6', color: '#fff', borderColor: '#3b82f6' },
  deviceCard: { background: '#1e293b', borderRadius: 12, padding: '16px', marginBottom: 10, cursor: 'pointer', border: '1px solid #1e293b', transition: 'border-color 0.2s' },
  deviceCardOpen: { borderColor: '#3b82f6' },
  deviceHeader: { display: 'flex', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  deviceName: { flex: 1, fontWeight: 600, fontSize: 16 },
  timeAgo: { fontSize: 12, color: '#94a3b8' },
  deviceDetails: { marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #334155', paddingTop: 14 },
  detailRow: { display: 'flex', justifyContent: 'space-between', fontSize: 14 },
  detailLabel: { color: '#94a3b8' },
  detailValue: { color: '#f1f5f9', fontWeight: 500, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-all' },
  mapLink: { color: '#60a5fa', fontSize: 14, textDecoration: 'none', marginTop: 4 },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 40 },
  footer: { textAlign: 'center', color: '#475569', fontSize: 12, marginTop: 24 },
};
