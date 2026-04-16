import { Fragment, useEffect, useState } from "react";
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
import "../dashboard/Dashboard.css";
import "./GpsAdmin.css";
import { BASE_URL } from "../../Api";

const COLORS = ["red", "blue", "green", "orange", "purple"];

function AutoFitMap({ latestPoint, polylinePoints }) {
  const map = useMap();

  useEffect(() => {
    if (latestPoint) {
      map.setView([latestPoint.lat, latestPoint.lng], 16, {
        animate: true,
      });
      return;
    }

    if (polylinePoints.length > 1) {
      const bounds = L.latLngBounds(polylinePoints);
      map.fitBounds(bounds, {
        padding: [30, 30],
        maxZoom: 16,
        animate: true,
      });
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
    shadowUrl:
      "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

export default function GpsAdmin() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("all");
  const [inputDevice, setInputDevice] = useState("");

  const [devicesData, setDevicesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDeviceLatest, setSelectedDeviceLatest] = useState(null);
  const [selectedDeviceHistory, setSelectedDeviceHistory] = useState([]);
  const [mapCenter, setMapCenter] = useState([-7.2575, 112.7521]);
  const [polylinePoints, setPolylinePoints] = useState([]);

  // fetch semua device
  const fetchAll = async () => {
    if (devices.length === 0) return;

    try {
      setLoading(true);

      const results = await Promise.all(
        devices.map(async (device_id, index) => {
          const color = COLORS[index % COLORS.length];

          // latest
          const latestRes = await fetch(
            `${BASE_URL}?path=telemetry/gps/latest?device_id=${device_id}`
          );
          const latestJson = await latestRes.json();

          // history dengan polyline endpoint (same as GpsTracking)
          const to = new Date();
          const from = new Date(to.getTime() - 30 * 60 * 1000);
          const historyRes = await fetch(
            `${BASE_URL}?path=telemetry/gps/polyline?device_id=${device_id}&from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`
          );
          const historyJson = await historyRes.json();

          // Normalize latest point
          const latestPoint = normalizePoint(latestJson.ok ? latestJson.data : null);

          // Normalize history data
          let history = [];
          if (historyJson.ok && historyJson.data) {
            const items = Array.isArray(historyJson.data.points)
              ? historyJson.data.points
              : Array.isArray(historyJson.data)
                ? historyJson.data
                : [];
            history = items
              .map(normalizePoint)
              .filter(Boolean)
              .map((point) => [point.lat, point.lng]);
          }

          return {
            device_id,
            color,
            position: latestPoint ? [latestPoint.lat, latestPoint.lng] : null,
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

  // fetch latest dan history untuk selected device
  const fetchSelectedDevice = async (deviceId) => {
    try {
      const latestRes = await fetch(
        `${BASE_URL}?path=telemetry/gps/latest?device_id=${deviceId}`
      );
      const latestJson = await latestRes.json();

      // history dengan polyline endpoint (same as GpsTracking)
      const to = new Date();
      const from = new Date(to.getTime() - 30 * 60 * 1000);
      const historyRes = await fetch(
        `${BASE_URL}?path=telemetry/gps/polyline?device_id=${deviceId}&from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`
      );
      const historyJson = await historyRes.json();

      const latestPoint = normalizePoint(latestJson.ok ? latestJson.data : null);
      if (latestPoint) {
        setSelectedDeviceLatest(latestPoint);
      } else {
        setSelectedDeviceLatest(null);
      }

      if (historyJson.ok && historyJson.data) {
        const items = Array.isArray(historyJson.data.points)
          ? historyJson.data.points
          : Array.isArray(historyJson.data)
            ? historyJson.data
            : [];
        const historyItems = items
          .map(normalizePoint)
          .filter(Boolean);
        setSelectedDeviceHistory(historyItems);
      } else {
        setSelectedDeviceHistory([]);
      }
    } catch (err) {
      console.error("Error fetching selected device data:", err);
    }
  };

  // realtime
  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, [devices]);

  // fetch selected device data
  useEffect(() => {
    if (selectedDevice && selectedDevice !== "all") {
      fetchSelectedDevice(selectedDevice);
      const interval = setInterval(() => fetchSelectedDevice(selectedDevice), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedDevice]);

  // update map center and polyline when selected device data changes
  useEffect(() => {
    if (selectedDeviceLatest) {
      setMapCenter([selectedDeviceLatest.lat, selectedDeviceLatest.lng]);
    }

    if (selectedDeviceHistory.length > 0) {
      const points = selectedDeviceHistory
        .map((point) => [point.lat, point.lng])
        .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
      setPolylinePoints(points);
    } else {
      setPolylinePoints([]);
    }
  }, [selectedDeviceLatest, selectedDeviceHistory]);

  // localStorage
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("gps_devices")) || [];
    setDevices(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("gps_devices", JSON.stringify(devices));
  }, [devices]);

  return (
    <div className="gps-admin-page">
      {/* TOP BAR */}
      <div className="dashboard-container">
        <div className="dashboard-card fade-in gps-admin-card">
          <div className="gps-admin-back">
            <button onClick={() => navigate("/")}>
              ← Kembali ke Dashboard
            </button>
          </div>
          <h1 className="dashboard-title">Admin GPS Monitoring</h1>
          <p className="dashboard-subtitle">
            Monitoring semua device secara realtime
          </p>

          {/* STATS OVERVIEW */}
          <div className="gps-admin-stats">
            <div>
              <div>{devices.length}</div>
              <div>Total Device</div>
            </div>
            <div>
              <div>{devicesData.filter(d => d.position).length}</div>
              <div>Device Aktif</div>
            </div>
            <div>
              <div>{devicesData.reduce((sum, d) => sum + d.history.length, 0)}</div>
              <div>Total Track</div>
            </div>
            <div>
              <div>{loading ? "..." : "Live"}</div>
              <div>Status</div>
            </div>
          </div>

          {/* INFO PANEL */}
          <div className="gps-admin-info-panel">
            <h2>📍 Informasi Device</h2>
            <p>
              Pilih device untuk melihat informasi detail lokasi terbaru dan history perjalanan
            </p>

            {selectedDevice && selectedDevice !== "all" && (
              <>
                <div className="gps-admin-info-grid">
                  <div className="gps-admin-info-card">
                    <div>Device ID</div>
                    <div>{selectedDevice}</div>
                  </div>
                  <div className="gps-admin-info-card">
                    <div>Latitude</div>
                    <div>
                      {selectedDeviceLatest ? selectedDeviceLatest.lat.toFixed(6) : "-"}
                    </div>
                  </div>
                  <div className="gps-admin-info-card">
                    <div>Longitude</div>
                    <div>
                      {selectedDeviceLatest ? selectedDeviceLatest.lng.toFixed(6) : "-"}
                    </div>
                  </div>
                  <div className="gps-admin-info-card">
                    <div>Akurasi GPS</div>
                    <div>
                      {selectedDeviceLatest?.accuracy_m != null
                        ? `${selectedDeviceLatest.accuracy_m.toFixed(1)} m`
                        : "-"}
                    </div>
                  </div>
                </div>

                {/* TRACKING MAP */}
                <div className="gps-admin-tracking-map">
                  <h3>🗺️ Peta Tracking Device</h3>
                  <div className="gps-admin-tracking-map-container">
                    <MapContainer center={mapCenter} zoom={16} style={{ height: "100%", width: "100%" }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <AutoFitMap
                        latestPoint={selectedDeviceLatest}
                        polylinePoints={polylinePoints}
                      />
                      {polylinePoints.length > 1 ? (
                        <Polyline
                          positions={polylinePoints}
                          pathOptions={{
                            color: "#2563eb",
                            weight: 4,
                            opacity: 0.8
                          }}
                        />
                      ) : null}
                      {selectedDeviceLatest ? (
                        <Marker
                          position={[selectedDeviceLatest.lat, selectedDeviceLatest.lng]}
                          icon={createIcon("blue")}
                        >
                          <Popup>
                            <strong>Posisi terbaru</strong>
                            <br />
                            {selectedDeviceLatest.lat.toFixed(6)}, {selectedDeviceLatest.lng.toFixed(6)}
                            <br />
                            {selectedDeviceLatest.accuracy_m != null
                              ? `Akurasi: ${selectedDeviceLatest.accuracy_m.toFixed(1)} m`
                              : ""}
                          </Popup>
                        </Marker>
                      ) : null}
                    </MapContainer>
                  </div>
                </div>

                {/* HISTORY LIST */}
                <div className="gps-admin-history-list">
                  <h3>📋 History Perjalanan (5 terbaru)</h3>
                  {selectedDeviceHistory.length > 0 ? (
                    <div>
                      {selectedDeviceHistory
                        .slice(-5)
                        .reverse()
                        .map((point, index) => (
                          <div
                            key={`${point.ts}-${index}`}
                            className="gps-admin-history-item"
                          >
                            <div className="gps-admin-history-content">
                              <div className="gps-admin-history-details">
                                <div className="gps-admin-history-time">
                                  {point.ts || "Waktu tidak tersedia"}
                                </div>
                                <div className="gps-admin-history-coords">
                                  📍 {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                                  {point.accuracy_m != null ? ` • ${point.accuracy_m.toFixed(1)} m` : ""}
                                </div>
                              </div>
                              <a
                                href={`https://www.google.com/maps?q=${point.lat},${point.lng}`}
                                target="_blank"
                                rel="noreferrer"
                                className="gps-admin-history-maps-link"
                              >
                                Maps
                              </a>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="gps-admin-empty-state">
                      Belum ada history GPS untuk device ini
                    </div>
                  )}
                </div>
              </>
            )}

            {(!selectedDevice || selectedDevice === "all") && (
              <div className="gps-admin-select-device-state">
                Pilih salah satu device dari dropdown di bawah untuk melihat detailnya
              </div>
            )}
          </div>

          {/* CONTROL */}
          <div className="gps-admin-controls">
            <div>
              <input
                className="gps-admin-input"
                type="text"
                placeholder="Tambah atau cari device_id"
                value={inputDevice}
                onChange={(e) => setInputDevice(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (inputDevice && !devices.includes(inputDevice)) {
                      setDevices([...devices, inputDevice]);
                      setInputDevice("");
                      setSelectedDevice(inputDevice);
                    }
                  }
                }}
              />
            </div>

            <button
              className="gps-admin-btn"
              onClick={() => {
                if (inputDevice && !devices.includes(inputDevice)) {
                  setDevices([...devices, inputDevice]);
                  setInputDevice("");
                  setSelectedDevice(inputDevice);
                }
              }}
            >
              Tambah Device
            </button>
          </div>

          {/* FILTER DROPDOWN */}
          <div className="gps-admin-filter-section">
            <label className="gps-admin-filter-label">
              Filter Device:
            </label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="gps-admin-select"
            >
              <option value="all">Semua Device ({devices.length})</option>
              {devices.map((device) => (
                <option key={device} value={device}>
                  📱 {device}
                </option>
              ))}
            </select>
          </div>

          {/*MAP BESAR */}
          <div className="gps-admin-map-wrapper">
            <MapContainer
              center={[-7.2575, 112.7521]}
              zoom={13}
              className="gps-admin-map-large"
              style={{
                height: "500px",
                width: "100%"
              }}
            >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {devicesData.map((dev, index) => (
                <Fragment key={index}>
                  {dev.position && (
                    <Marker
                      position={dev.position}
                      icon={createIcon(dev.color)}
                    >
                      <Popup>
                        <div style={{ fontSize: "14px", lineHeight: "1.4" }}>
                          <strong style={{ color: dev.color }}>📍 {dev.device_id}</strong>
                          <br />
                          📊 Status: <strong>Aktif</strong>
                          <br />
                          📈 Track points: <strong>{dev.history.length}</strong>
                          <br />
                          <small style={{ color: "#666" }}>
                            Klik untuk detail lebih lanjut
                          </small>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {dev.history.length > 0 && (
                    <Polyline
                      positions={dev.history}
                      pathOptions={{
                        color: dev.color,
                        weight: 3,
                        opacity: 0.7,
                        dashArray: "5, 10"
                      }}
                    />
                  )}
                </Fragment>
              ))}
            </MapContainer>
          </div>

          {/* LEGEND */}
          <div className="gps-admin-legend">
            {devicesData.map((dev, i) => (
              <div
                key={i}
                className="gps-admin-legend-item"
                onClick={() => setSelectedDevice(dev.device_id)}
                style={{
                  '--legend-color': dev.color,
                  '--status-color': dev.position ? '#48bb78' : '#e53e3e'
                }}
              >
                <span className="gps-admin-legend-dot"></span>
                <span>📱 {dev.device_id}</span>
                <span className="gps-admin-status-indicator">
                  {dev.position ? "●" : "○"}
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}