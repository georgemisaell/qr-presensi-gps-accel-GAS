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

  const BASE_URL = "https://script.google.com/macros/s/AKfycbxJormXSihwT-iFqMqpvb7kJrrGfB8fq__x9TTAf4QrTnEmuR0sJulHoWaMrlGk-h5P/exec";

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
            `${BASE_URL}/telemetry/gps/latest?device_id=${device_id}`
          );
          const latestJson = await latestRes.json();

          // history
          const historyRes = await fetch(
            `${BASE_URL}/telemetry/gps/history?device_id=${device_id}&limit=100`
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

  // realtime
  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, [devices]);

  // localStorage
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("gps_devices")) || [];
    setDevices(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("gps_devices", JSON.stringify(devices));
  }, [devices]);

  // filter device
  const filteredDevices =
    selectedDevice === "all"
      ? devicesData
      : devicesData.filter((d) => d.device_id === selectedDevice);

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

          {/* CONTROL */}
          <div className="gps-admin-controls">
            <input
              className="gps-admin-input"
              type="text"
              placeholder="Masukkan device_id"
              value={inputDevice}
              onChange={(e) => setInputDevice(e.target.value)}
            />

            <button
              className="gps-admin-btn"
              onClick={() => {
                if (inputDevice && !devices.includes(inputDevice)) {
                  setDevices([...devices, inputDevice]);
                  setInputDevice("");
                }
              }}
            >
              Tambah
            </button>

            <select
              className="gps-admin-select"
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
            >
              <option value="all">Semua Device</option>
              {devices.map((dev, i) => (
                <option key={i} value={dev}>
                  {dev}
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