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
  const [devicesData, setDevicesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState([-7.2575, 112.7521]);

  // 🔥 ambil device otomatis dari backend
  const fetchDevicesFromLogs = async () => {
    try {
      const res = await fetch(`${BASE_URL}?path=sensor/gps/logs`);
      const json = await res.json();

      if (json.ok && json.data) {
        const uniqueDevices = [
          ...new Set(json.data.map((item) => item.device_id)),
        ];
        setDevices(uniqueDevices);
      }
    } catch (err) {
      console.error("Error fetch devices:", err);
    }
  };

  // 🔥 fetch semua data device
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

          const latestPoint = normalizePoint(
            latestJson.ok ? latestJson.data : null
          );

          let history = [];
          if (historyJson.ok && historyJson.data) {
            const items = Array.isArray(historyJson.data.points)
              ? historyJson.data.points
              : [];

            history = items
              .map(normalizePoint)
              .filter(Boolean)
              .map((p) => [p.lat, p.lng]);
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

  // 🔥 auto ambil device
  useEffect(() => {
    fetchDevicesFromLogs();
    const interval = setInterval(fetchDevicesFromLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  // 🔥 auto fetch data
  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, [devices]);

  // 🔥 auto pilih device pertama
  useEffect(() => {
    if (devices.length > 0 && selectedDevice === "all") {
      setSelectedDevice(devices[0]);
    }
  }, [devices]);

  // 🔥 filter device
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
    if (allMapPoints.length > 0) {
      setMapCenter(allMapPoints[0]);
    }
  }, [allMapPoints]);

  return (
    <div className="gps-admin-page">
      <div className="dashboard-container">

        <div className="dashboard-card fade-in gps-admin-card">

          {/* HEADER */}
          <div className="gps-admin-header">
            <div>
              <h1 className="gps-title">📡 GPS Monitoring</h1>
              <p className="gps-subtitle">
                Monitoring semua device secara realtime
              </p>
            </div>

            <button
              className="gps-back-btn"
              onClick={() => navigate("/")}
            >
              ← Dashboard
            </button>
          </div>

          {/* FILTER BAR */}
          <div className="gps-filter-bar">
            <div className="gps-filter-group">
              <label>Filter Device</label>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="gps-select"
              >
                <option value="all">Semua Device</option>
                {devices.map((d) => (
                  <option key={d} value={d}>
                    📱 {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="gps-status">
              {loading ? "🔄 Loading..." : "🟢 Live"}
            </div>
          </div>

          {/* MAP CARD */}
          <div className="gps-map-card">

            <MapContainer
              center={mapCenter}
              zoom={13}
              className="gps-map"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              <AutoFitMap
                latestPoint={null}
                polylinePoints={allMapPoints}
              />

              {filteredDevices.map((dev, i) => (
                <Fragment key={i}>
                  {dev.position && (
                    <Marker
                      position={dev.position}
                      icon={createIcon(dev.color)}
                    >
                      <Popup>
                        <div className="gps-popup">
                          <strong>📱 {dev.device_id}</strong>
                          <br />
                          📍 Posisi aktif
                          <br />
                          📊 Track: {dev.history.length}
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {dev.history.length > 0 && (
                    <Polyline
                      positions={dev.history}
                      pathOptions={{
                        color: dev.color,
                        weight: 4,
                        opacity: 0.7,
                      }}
                    />
                  )}
                </Fragment>
              ))}
            </MapContainer>

          </div>

        </div>
      </div>
    </div>
  );
}