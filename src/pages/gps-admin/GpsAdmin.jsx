import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../dashboard/Dashboard.css";
import "./GpsAdmin.css";
import { BASE_URL } from "../../Api";

const COLORS = ["red", "blue", "green", "orange", "purple"];

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

          // history
          const historyRes = await fetch(
            `${BASE_URL}?path=telemetry/gps/history?device_id=${device_id}&limit=100`
          );
          const historyJson = await historyRes.json();

          return {
            device_id,
            color,
            position:
              latestJson.ok && latestJson.data
                ? [latestJson.data.lat, latestJson.data.lng]
                : null,
            history:
              historyJson.ok && historyJson.data?.items
                ? historyJson.data.items.map((item) => [
                    item.lat,
                    item.lng,
                  ])
                : [],
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

      const historyRes = await fetch(
        `${BASE_URL}?path=telemetry/gps/history?device_id=${deviceId}&limit=100`
      );
      const historyJson = await historyRes.json();

      if (latestJson.ok && latestJson.data) {
        setSelectedDeviceLatest({
          ts: latestJson.data.ts || latestJson.data.time || new Date().toISOString(),
          lat: latestJson.data.lat,
          lng: latestJson.data.lng,
          accuracy_m: latestJson.data.accuracy_m || latestJson.data.accuracy || null,
        });
      }

      if (historyJson.ok && historyJson.data?.items) {
        const historyItems = historyJson.data.items.map((item) => ({
          ts: item.ts || item.time || "",
          lat: item.lat,
          lng: item.lng,
          accuracy_m: item.accuracy_m || item.accuracy || null,
        }));
        setSelectedDeviceHistory(historyItems);
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

  // localStorage
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("gps_devices")) || [];
    setDevices(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("gps_devices", JSON.stringify(devices));
  }, [devices]);

  // filter device
  const filteredDevices = devicesData.filter((d) =>
    selectedDevice
      ? d.device_id.toLowerCase().includes(selectedDevice.toLowerCase())
      : true
  );

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

          {/* INFO PANEL */}
          <div className="gps-admin-info-panel" style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
            <h2 style={{ marginTop: 0 }}>Informasi Device</h2>
            <p style={{ marginBottom: "15px", color: "#666" }}>
              Pilih device untuk melihat informasi detail lokasi terbaru dan history perjalanan
            </p>

            {selectedDevice && selectedDevice !== "all" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", marginBottom: "15px" }}>
                  <div style={{ padding: "10px", backgroundColor: "#fff", borderRadius: "4px" }}>
                    <div style={{ fontSize: "12px", color: "#666" }}>Device ID</div>
                    <div style={{ fontSize: "14px", fontWeight: "bold" }}>{selectedDevice}</div>
                  </div>
                  <div style={{ padding: "10px", backgroundColor: "#fff", borderRadius: "4px" }}>
                    <div style={{ fontSize: "12px", color: "#666" }}>Latitude</div>
                    <div style={{ fontSize: "14px", fontWeight: "bold" }}>
                      {selectedDeviceLatest ? selectedDeviceLatest.lat.toFixed(6) : "-"}
                    </div>
                  </div>
                  <div style={{ padding: "10px", backgroundColor: "#fff", borderRadius: "4px" }}>
                    <div style={{ fontSize: "12px", color: "#666" }}>Longitude</div>
                    <div style={{ fontSize: "14px", fontWeight: "bold" }}>
                      {selectedDeviceLatest ? selectedDeviceLatest.lng.toFixed(6) : "-"}
                    </div>
                  </div>
                  <div style={{ padding: "10px", backgroundColor: "#fff", borderRadius: "4px" }}>
                    <div style={{ fontSize: "12px", color: "#666" }}>Akurasi GPS</div>
                    <div style={{ fontSize: "14px", fontWeight: "bold" }}>
                      {selectedDeviceLatest?.accuracy_m != null
                        ? `${selectedDeviceLatest.accuracy_m.toFixed(1)} m`
                        : "-"}
                    </div>
                  </div>
                </div>

                {/* HISTORY LIST */}
                <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #e0e0e0", borderRadius: "4px", padding: "10px" }}>
                  <h3 style={{ marginTop: 0, fontSize: "14px" }}>History Perjalanan (5 terbaru)</h3>
                  {selectedDeviceHistory.length > 0 ? (
                    <div>
                      {selectedDeviceHistory
                        .slice(-5)
                        .reverse()
                        .map((point, index) => (
                          <div
                            key={`${point.ts}-${index}`}
                            style={{
                              padding: "8px",
                              borderBottom: "1px solid #f0f0f0",
                              fontSize: "12px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: "bold" }}>
                                {point.ts || "Waktu tidak tersedia"}
                              </div>
                              <div style={{ color: "#666", marginTop: "2px" }}>
                                {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                                {point.accuracy_m != null ? ` • ${point.accuracy_m.toFixed(1)} m` : ""}
                              </div>
                            </div>
                            <a
                              href={`https://www.google.com/maps?q=${point.lat},${point.lng}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                fontSize: "11px",
                                color: "#2563eb",
                                textDecoration: "none",
                                whiteSpace: "nowrap",
                                marginLeft: "10px",
                              }}
                            >
                              Maps
                            </a>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, color: "#999", fontSize: "12px" }}>
                      Belum ada history GPS
                    </p>
                  )}
                </div>
              </>
            )}

            {(!selectedDevice || selectedDevice === "all") && (
              <p style={{ margin: 0, color: "#999" }}>Pilih salah satu device dari filter di atas untuk melihat detailnya</p>
            )}
          </div>

          {/* CONTROL */}
          <div className="gps-admin-controls">
            <input
              className="gps-admin-input"
              type="text"
              placeholder="Tambah atau filter device_id"
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
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              Filter Device:
            </label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                fontSize: "14px",
              }}
            >
              <option value="all">Semua Device</option>
              {devices.map((device) => (
                <option key={device} value={device}>
                  {device}
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
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {filteredDevices.map((dev, index) => (
                <div key={index}>
                  {dev.position && (
                    <Marker
                      position={dev.position}
                      icon={createIcon(dev.color)}
                    >
                      <Popup>
                        <b>{dev.device_id}</b>
                      </Popup>
                    </Marker>
                  )}

                  <Polyline
                    positions={dev.history}
                    pathOptions={{ color: dev.color }}
                  />
                </div>
              ))}
            </MapContainer>
          </div>

          {/*LEGEND */}
          <div className="gps-admin-legend">
            {devicesData.map((dev, i) => (
              <span key={i}>
                <span
                  className="legend-dot"
                  style={{ backgroundColor: dev.color }}
                ></span>
                {dev.device_id}
              </span>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}