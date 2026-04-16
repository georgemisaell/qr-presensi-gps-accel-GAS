import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./GpsAdmin.css";
import { BASE_URL } from "../../Api";

const COLORS = ["red", "blue", "green", "orange", "purple"];

function AutoFitMap({ latestPoint, polylinePoints }) {
  const map = useMap();

  useEffect(() => {
    if (latestPoint) {
      map.setView([latestPoint.lat, latestPoint.lng], 16, { animate: true });
      return;
    }
    if (polylinePoints.length > 1) {
      const bounds = L.latLngBounds(polylinePoints);
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16, animate: true });
    }
  }, [latestPoint, map, polylinePoints]);

  return null;
}

function normalizePoint(point) {
  if (!point) return null;
  const lat = Number(point.lat ?? point.latitude);
  const lng = Number(point.lng ?? point.lon ?? point.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    ts: point.ts || point.time || point.recorded_at || point.waktu || "",
    lat,
    lng,
    accuracy_m: point.accuracy_m ?? point.accuracy ?? null,
  };
}

const createIcon = (color) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

const COLOR_DOT = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  orange: "#f97316",
  purple: "#a855f7",
};

export default function GpsAdmin() {
  const navigate = useNavigate();

  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("all");
  const [devicesData, setDevicesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState([-7.2575, 112.7521]);

  const fetchDevicesFromLogs = async () => {
    try {
      const res = await fetch(`${BASE_URL}?path=sensor/gps/logs`);
      const json = await res.json();
      if (json.ok && json.data) {
        const uniqueDevices = [...new Set(json.data.map((item) => item.device_id))];
        setDevices(uniqueDevices);
      }
    } catch (err) {
      console.error("Error fetch devices:", err);
    }
  };

  const fetchAll = async () => {
    if (devices.length === 0) return;
    try {
      setLoading(true);
      const results = await Promise.all(
        devices.map(async (device_id, index) => {
          const color = COLORS[index % COLORS.length];

          const latestRes = await fetch(
            `${BASE_URL}?path=telemetry/gps/latest?device_id=${device_id}`
          );
          const latestJson = await latestRes.json();

          const to = new Date();
          const from = new Date(to.getTime() - 30 * 60 * 1000);

          const historyRes = await fetch(
            `${BASE_URL}?path=telemetry/gps/polyline&device_id=${device_id}&from=${encodeURIComponent(
              from.toISOString()
            )}&to=${encodeURIComponent(to.toISOString())}`
          );
          const historyJson = await historyRes.json();

          const latestPoint = normalizePoint(latestJson.ok ? latestJson.data : null);

          let history = [];
          if (historyJson.ok && historyJson.data) {
            const items = Array.isArray(historyJson.data.points) ? historyJson.data.points : [];
            history = items.map(normalizePoint).filter(Boolean).map((p) => [p.lat, p.lng]);
          }

          return {
            device_id,
            color,
            position: latestPoint
              ? [latestPoint.lat, latestPoint.lng]
              : history.length > 0
              ? history[history.length - 1]
              : null,
            history,
          };
        })
      );
      setDevicesData(results);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevicesFromLogs();
    const interval = setInterval(fetchDevicesFromLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, [devices]);

  useEffect(() => {
    if (devices.length > 0 && selectedDevice === "all") {
      setSelectedDevice(devices[0]);
    }
  }, [devices]);

  const filteredDevices =
    selectedDevice === "all"
      ? devicesData
      : devicesData.filter((d) => d.device_id === selectedDevice);

  const allMapPoints = useMemo(() => {
    return devicesData.flatMap((dev) => [
      ...(dev.position ? [dev.position] : []),
      ...dev.history,
    ]);
  }, [devicesData]);

  useEffect(() => {
    if (allMapPoints.length > 0) setMapCenter(allMapPoints[0]);
  }, [allMapPoints]);

  const totalTrack = devicesData.reduce((sum, d) => sum + d.history.length, 0);
  const activeDevices = devicesData.filter((d) => d.position).length;

  return (
    <div className="gps-page">

      {/* SIDEBAR */}
      <aside className="gps-sidebar">
        <div className="gps-sidebar-brand">
          <div className="gps-brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              <circle cx="12" cy="12" r="9" strokeDasharray="2 3" />
            </svg>
          </div>
          <div>
            <p className="gps-brand-title">GPS Monitor</p>
            <p className="gps-brand-sub">Admin Panel</p>
          </div>
        </div>

        {/* Stats */}
        <div className="gps-stats-grid">
          <div className="gps-stat-card">
            <p className="gps-stat-label">Total Device</p>
            <p className="gps-stat-value">{devices.length}</p>
          </div>
          <div className="gps-stat-card">
            <p className="gps-stat-label">Aktif</p>
            <p className="gps-stat-value gps-stat-active">{activeDevices}</p>
          </div>
          <div className="gps-stat-card gps-stat-full">
            <p className="gps-stat-label">Total Titik Track</p>
            <p className="gps-stat-value">{totalTrack}</p>
          </div>
        </div>

        {/* Device list */}
        <div className="gps-device-section">
          <p className="gps-section-label">Filter Device</p>
          <div className="gps-device-list">
            <button
              className={`gps-device-item ${selectedDevice === "all" ? "active" : ""}`}
              onClick={() => setSelectedDevice("all")}
            >
              <span className="gps-device-dot" style={{ background: "#64748b" }} />
              <span className="gps-device-name">Semua Device</span>
              <span className="gps-device-count">{devices.length}</span>
            </button>

            {devicesData.map((dev) => (
              <button
                key={dev.device_id}
                className={`gps-device-item ${selectedDevice === dev.device_id ? "active" : ""}`}
                onClick={() => setSelectedDevice(dev.device_id)}
              >
                <span
                  className="gps-device-dot"
                  style={{ background: COLOR_DOT[dev.color] || "#64748b" }}
                />
                <span className="gps-device-name">{dev.device_id}</span>
                <span className={`gps-device-badge ${dev.position ? "online" : "offline"}`}>
                  {dev.position ? "live" : "off"}
                </span>
              </button>
            ))}
          </div>
        </div>

        <button className="gps-back-btn" onClick={() => navigate("/")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Kembali ke Dashboard
        </button>
      </aside>

      {/* MAIN */}
      <main className="gps-main">

        {/* Top bar */}
        <div className="gps-topbar">
          <div>
            <h1 className="gps-page-title">GPS Tracking</h1>
            <p className="gps-page-sub">Monitoring realtime · 30 menit terakhir</p>
          </div>
          <div className="gps-live-badge">
            <span className={`gps-live-dot ${loading ? "loading" : ""}`} />
            {loading ? "Memuat..." : "Live"}
          </div>
        </div>

        {/* Map */}
        <div className="gps-map-wrapper">
          <MapContainer center={mapCenter} zoom={13} className="gps-map">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <AutoFitMap latestPoint={null} polylinePoints={allMapPoints} />

            {filteredDevices.map((dev, i) => (
              <Fragment key={i}>
                {dev.position && (
                  <Marker position={dev.position} icon={createIcon(dev.color)}>
                    <Popup>
                      <div className="gps-popup">
                        <p className="gps-popup-title">{dev.device_id}</p>
                        <p className="gps-popup-info">Posisi aktif</p>
                        <p className="gps-popup-info">Track: {dev.history.length} titik</p>
                      </div>
                    </Popup>
                  </Marker>
                )}
                {dev.history.length > 0 && (
                  <Polyline
                    positions={dev.history}
                    pathOptions={{ color: COLOR_DOT[dev.color] || dev.color, weight: 4, opacity: 0.75 }}
                  />
                )}
              </Fragment>
            ))}
          </MapContainer>

          {/* Map legend */}
          {filteredDevices.length > 1 && (
            <div className="gps-legend">
              {filteredDevices.map((dev) => (
                <div key={dev.device_id} className="gps-legend-item">
                  <span
                    className="gps-legend-line"
                    style={{ background: COLOR_DOT[dev.color] || "#64748b" }}
                  />
                  <span>{dev.device_id}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
