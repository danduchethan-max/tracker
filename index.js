import { useState, useEffect, useCallback } from "react";

const ACTIVE_THRESHOLD_SECONDS = 5 * 60; // "active" = checked in within last 5 min
const REFRESH_INTERVAL_MS = 15000;

function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function timeAgo(unixSeconds) {
  const diff = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Home() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [devices, setDevices] = useState([]);
  const [filter, setFilter] = useState("all"); // "all" | "active"
  const [selected, setSelected] = useState(null);
  const [phoneLoc, setPhoneLoc] = useState(null);
  const [phoneLocError, setPhoneLocError] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem("viewer_password");
    if (saved) {
      setPassword(saved);
      setAuthed(true);
    }
  }, []);

  const fetchDevices = useCallback(async (pwd) => {
    try {
      const res = await fetch("/api/devices", {
        headers: { "x-viewer-password": pwd },
      });
      if (res.status === 401) {
        setAuthError("Wrong password");
        setAuthed(false);
        sessionStorage.removeItem("viewer_password");
        return;
      }
      const data = await res.json();
      setDevices(data.devices || []);
    } catch (e) {
      setAuthError("Could not reach server");
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    fetchDevices(password);
    const interval = setInterval(() => fetchDevices(password), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [authed, password, fetchDevices]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setPhoneLocError("Location not supported on this browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setPhoneLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setPhoneLocError("Location permission denied"),
      { enableHighAccuracy: true }
    );
  }, []);

  function handleLogin(e) {
    e.preventDefault();
    setAuthError("");
    sessionStorage.setItem("viewer_password", password);
    setAuthed(true);
  }

  if (!authed) {
    return (
      <div className="container">
        <h1>Device Tracker</h1>
        <p className="subtitle">Enter your dashboard password</p>
        <form className="password-screen" onSubmit={handleLogin}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <button type="submit">Unlock</button>
          {authError && <span className="error-text">{authError}</span>}
        </form>
      </div>
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const isActive = (d) => now - d.timestamp <= ACTIVE_THRESHOLD_SECONDS;
  const activeCount = devices.filter(isActive).length;
  const shown = filter === "active" ? devices.filter(isActive) : devices;

  return (
    <div className="container">
      <h1>Device Tracker</h1>
      <p className="subtitle">Your private laptop tracker</p>

      <div className="stat-row">
        <div className="stat-card">
          <div className="num">{devices.length}</div>
          <div className="label">Total Devices</div>
        </div>
        <div className="stat-card">
          <div className="num">{activeCount}</div>
          <div className="label">Active Now</div>
        </div>
      </div>

      <div className="filter-toggle">
        <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
          All Devices
        </button>
        <button className={filter === "active" ? "active" : ""} onClick={() => setFilter("active")}>
          Active Devices
        </button>
      </div>

      {shown.length === 0 && <p className="empty">No devices to show yet.</p>}

      {shown.map((d) => {
        const active = isActive(d);
        const dist =
          phoneLoc && d.lat != null
            ? haversineDistanceKm(phoneLoc.lat, phoneLoc.lng, d.lat, d.lng).toFixed(2)
            : null;
        return (
          <div className="device-card" key={d.name} onClick={() => setSelected(d)}>
            <div className="row1">
              <span className="name">
                <span className={`status-dot ${active ? "online" : "offline"}`} />
                {d.name}
              </span>
              {dist && <span>{dist} km</span>}
            </div>
            <div className="meta">
              {d.wifi ? `Wi-Fi: ${d.wifi} · ` : ""}
              {timeAgo(d.timestamp)}
            </div>
          </div>
        );
      })}

      {phoneLocError && <p className="error-text">{phoneLocError} (distance unavailable)</p>}

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h1>{selected.name}</h1>
            <div className="detail-row">
              <span className="label">Status</span>
              <span>{isActive(selected) ? "Active" : "Offline"}</span>
            </div>
            <div className="detail-row">
              <span className="label">Coordinates</span>
              <span>{selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Wi-Fi network</span>
              <span>{selected.wifi || "Unknown"}</span>
            </div>
            <div className="detail-row">
              <span className="label">Last seen</span>
              <span>{timeAgo(selected.timestamp)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Distance from you</span>
              <span>
                {phoneLoc
                  ? `${haversineDistanceKm(phoneLoc.lat, phoneLoc.lng, selected.lat, selected.lng).toFixed(2)} km`
                  : "Unavailable"}
              </span>
            </div>
            <button className="close" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
