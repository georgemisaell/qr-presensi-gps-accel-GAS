import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapContainer,
  Marker,
  Popup,
  Polyline,
  TileLayer,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { BASE_URL } from "../Api";
import "./GpsTracking.css";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DEFAULT_CENTER = [-6.2, 106.8];
const HISTORY_LIMIT = 200;
const POLL_INTERVAL_MS = 5000;
const GEO_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 5000,
  timeout: 15000,
};

function getOrCreateGpsDeviceId() {
  let id = localStorage.getItem("gas_gps_device_id");
  if (!id) {
    id = "GPS-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem("gas_gps_device_id", id);
  }
  return id;
}

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function normalizeGpsPoint(point) {
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

async function postGpsPoint(payload) {
  const response = await fetch(`${BASE_URL}?path=telemetry/gps`, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  if (!json.ok) {
    throw new Error(json.error || "GPS upload failed");
  }

  return json.data;
}

async function getGpsLatest(deviceId) {
  const tryPaths = [
    `telemetry/gps/latest?device_id=${encodeURIComponent(deviceId)}`,
    `sensor/gps/marker?device_id=${encodeURIComponent(deviceId)}`,
  ];

  for (const query of tryPaths) {
    const response = await fetch(`${BASE_URL}?path=${query}`, {
      cache: "no-store",
    });
    const json = await response.json();
    if (json.ok && json.data) {
      return normalizeGpsPoint(json.data);
    }
  }

  return null;
}

async function getGpsHistory(deviceId) {
  const now = new Date();
  const from = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
  const to = now.toISOString();

  const tryQueries = [
    `telemetry/gps/history?device_id=${encodeURIComponent(deviceId)}&limit=${HISTORY_LIMIT}`,
    `sensor/gps/polyline?device_id=${encodeURIComponent(deviceId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  ];

  for (const query of tryQueries) {
    const response = await fetch(`${BASE_URL}?path=${query}`, {
      cache: "no-store",
    });
    const json = await response.json();
    if (json.ok && json.data) {
      const items = Array.isArray(json.data.items)
        ? json.data.items
        : Array.isArray(json.data.points)
          ? json.data.points
          : Array.isArray(json.data)
            ? json.data
            : [];

      return items
        .map((point) => normalizeGpsPoint(point))
        .filter(Boolean)
        .slice(-HISTORY_LIMIT);
    }
  }

  return [];
}

export default function GpsTracking() {
  const navigate = useNavigate();
  const watchIdRef = useRef(null);
  const pollRef = useRef(null);
  const currentPointRef = useRef(null);

  const [deviceId] = useState(getOrCreateGpsDeviceId);
  const [isTracking, setIsTracking] = useState(false);
  const [status, setStatus] = useState("Siap untuk mengambil GPS.");
  const [statusType, setStatusType] = useState("idle");
  const [latestPoint, setLatestPoint] = useState(null);
  const [currentPoint, setCurrentPoint] = useState(null);
  const [history, setHistory] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    currentPointRef.current = currentPoint;
  }, [currentPoint]);

  const mapCenter = useMemo(() => {
    const point = latestPoint || currentPoint || history[history.length - 1];
    return point ? [point.lat, point.lng] : DEFAULT_CENTER;
  }, [latestPoint, currentPoint, history]);

  const polylinePoints = useMemo(() => {
    return history
      .map((point) => [point.lat, point.lng])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
  }, [history]);

  const refreshRemoteData = useCallback(async () => {
    try {
      const [latest, historyItems] = await Promise.all([
        getGpsLatest(deviceId),
        getGpsHistory(deviceId),
      ]);

      if (latest) {
        setLatestPoint(latest);
      }

      setHistory(historyItems);
      setErrorMessage("");
    } catch (error) {
      console.error(error);
      setErrorMessage("Gagal mengambil data GPS dari server.");
    }
  }, [deviceId]);

  const uploadPoint = useCallback(
    async (point) => {
      setIsSending(true);
      try {
        const accepted = await postGpsPoint({
          device_id: deviceId,
          ts: point.ts,
          lat: point.lat,
          lng: point.lng,
          accuracy_m: point.accuracy_m,
        });

        setLatestPoint({
          ts: point.ts,
          lat: point.lat,
          lng: point.lng,
          accuracy_m: point.accuracy_m,
        });
        setErrorMessage("");
        setStatus(`Lokasi terkirim. accepted=${accepted?.accepted ?? true}`);
        setStatusType("tracking");
      } catch (error) {
        console.error(error);
        setStatus("Gagal mengirim GPS ke server.");
        setStatusType("error");
      } finally {
        setIsSending(false);
      }
    },
    [deviceId],
  );

  const handlePosition = useCallback((position) => {
    const point = {
      ts: new Date().toISOString(),
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy_m: position.coords.accuracy,
    };

    setCurrentPoint(point);
    setStatus(
      `GPS aktif. Lat ${point.lat.toFixed(6)}, Lng ${point.lng.toFixed(6)}`,
    );
    setStatusType("tracking");
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("Browser ini tidak mendukung GPS.");
      setStatusType("error");
      return;
    }

    setErrorMessage("");
    setStatus("Meminta izin lokasi...");
    setStatusType("idle");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = {
          ts: new Date().toISOString(),
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy_m: position.coords.accuracy,
        };

        setIsTracking(true);
        setCurrentPoint(point);
        setStatus("GPS aktif. Data akan dikirim saat Anda menekan Stop.");
        setStatusType("tracking");

        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
          handlePosition,
          (error) => {
            console.error(error);
            setStatus("Gagal membaca GPS. Pastikan izin lokasi aktif.");
            setStatusType("error");
          },
          GEO_OPTIONS,
        );
      },
      (error) => {
        console.error(error);
        setStatus("Izin lokasi ditolak atau GPS tidak tersedia.");
        setStatusType("error");
      },
      GEO_OPTIONS,
    );
  }, [handlePosition]);

  const stopTracking = useCallback(async () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    setIsTracking(false);

    const finalPoint = currentPointRef.current;
    if (!finalPoint) {
      setStatus("Tracking GPS dihentikan. Tidak ada titik yang dikirim.");
      setStatusType("warning");
      return;
    }

    setStatus("Mengirim lokasi terakhir ke server...");
    setStatusType("idle");
    await uploadPoint(finalPoint);
    setStatus("Tracking dihentikan. Lokasi terakhir berhasil dikirim.");
    setStatusType("idle");
  }, [uploadPoint]);

  const handleBack = useCallback(async () => {
    if (isTracking) {
      await stopTracking();
    }
    navigate("/");
  }, [isTracking, navigate, stopTracking]);

  useEffect(() => {
    refreshRemoteData();
    pollRef.current = setInterval(refreshRemoteData, POLL_INTERVAL_MS);

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      clearInterval(pollRef.current);
    };
  }, [refreshRemoteData]);

  return (
    <div className="gps-page">
      <div className="gps-top-nav">
        <button type="button" className="gps-back-btn" onClick={handleBack}>
          Kembali ke Dashboard
        </button>
      </div>

      <div className="gps-shell">
        <section className="gps-panel fade-in">
          <h1>GPS + Peta</h1>
          <p className="gps-subtitle">
            Pantau pergerakan GPS di klien. Data yang dikirim ke backend hanya
            titik terakhir saat tracking dihentikan.
          </p>

          <div className="gps-device-row">
            <span className="gps-chip">Device ID: {deviceId}</span>
            <span className="gps-chip">Titik history: {history.length}</span>
            <span className="gps-chip">
              Status: {isTracking ? "tracking" : "idle"}
            </span>
          </div>

          <div className="gps-controls">
            <input
              className="gps-input"
              type="text"
              value={deviceId}
              readOnly
            />
            <input
              className="gps-input"
              type="text"
              value={
                currentPoint || latestPoint
                  ? `${(currentPoint || latestPoint).lat.toFixed(6)}, ${(currentPoint || latestPoint).lng.toFixed(6)}`
                  : "-"
              }
              readOnly
            />
          </div>

          <div className="gps-action-row">
            {!isTracking ? (
              <button
                type="button"
                className="gps-btn gps-btn-start"
                onClick={startTracking}
              >
                Mulai GPS
              </button>
            ) : (
              <button
                type="button"
                className="gps-btn gps-btn-stop"
                onClick={stopTracking}
              >
                Stop GPS
              </button>
            )}

            <button
              type="button"
              className="gps-btn gps-btn-secondary"
              onClick={refreshRemoteData}
              disabled={isSending}
            >
              Refresh Data
            </button>
          </div>

          <p className={`gps-status gps-status--${statusType}`}>{status}</p>
          {errorMessage ? (
            <p className="gps-status gps-status--warning">{errorMessage}</p>
          ) : null}
          {isSending ? (
            <p className="gps-status gps-status--idle">Mengirim titik GPS...</p>
          ) : null}

          <div className="gps-stats">
            <div className="gps-stat">
              <span>Latitude</span>
              <strong>{latestPoint ? latestPoint.lat.toFixed(6) : "-"}</strong>
            </div>
            <div className="gps-stat">
              <span>Longitude</span>
              <strong>{latestPoint ? latestPoint.lng.toFixed(6) : "-"}</strong>
            </div>
            <div className="gps-stat">
              <span>Accuracy</span>
              <strong>
                {latestPoint?.accuracy_m != null
                  ? `${latestPoint.accuracy_m.toFixed(1)} m`
                  : "-"}
              </strong>
            </div>
          </div>

          <div className="gps-list">
            {history
              .slice(-5)
              .reverse()
              .map((point, index) => (
                <div className="gps-list-item" key={`${point.ts}-${index}`}>
                  <div>
                    <p className="gps-list-title">
                      {point.ts || "Waktu tidak tersedia"}
                    </p>
                    <p className="gps-list-subtitle">
                      {point.lat.toFixed(6)}, {point.lng.toFixed(6)}{" "}
                      {point.accuracy_m != null
                        ? `• ${point.accuracy_m.toFixed(1)} m`
                        : ""}
                    </p>
                  </div>
                  <a
                    className="gps-list-link"
                    href={`https://www.google.com/maps?q=${point.lat},${point.lng}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Buka Maps
                  </a>
                </div>
              ))}
            {!history.length ? (
              <p className="gps-empty">Belum ada history GPS dari server.</p>
            ) : null}
          </div>
        </section>

        <section className="gps-panel fade-in">
          <h2>Peta Tracking</h2>
          <p className="gps-subtitle">
            Marker menunjukkan posisi terbaru, sedangkan garis menunjukkan
            history perjalanan.
          </p>

          <div className="gps-map-wrap">
            <MapContainer center={mapCenter} zoom={16} className="gps-map">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {polylinePoints.length > 1 ? (
                <Polyline
                  positions={polylinePoints}
                  pathOptions={{ color: "#2563eb", weight: 5 }}
                />
              ) : null}
              {latestPoint ? (
                <Marker
                  position={[latestPoint.lat, latestPoint.lng]}
                  icon={defaultIcon}
                >
                  <Popup>
                    <strong>Posisi terbaru</strong>
                    <br />
                    {latestPoint.lat.toFixed(6)}, {latestPoint.lng.toFixed(6)}
                    <br />
                    {latestPoint.accuracy_m != null
                      ? `Akurasi: ${latestPoint.accuracy_m.toFixed(1)} m`
                      : ""}
                  </Popup>
                </Marker>
              ) : null}
            </MapContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
