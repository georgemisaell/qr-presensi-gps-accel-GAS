import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../Api";
import "./GpsTracking.css";

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
  if (json.ok) {
    return json.data;
  }

  throw new Error(json.error || "GPS upload failed");
}

async function getGpsLatest(deviceId) {
  const query = `telemetry/gps/latest?device_id=${encodeURIComponent(deviceId)}`;
  const response = await fetch(`${BASE_URL}?path=${query}`, {
    cache: "no-store",
  });
  const json = await response.json();
  if (json.ok && json.data) {
    return normalizeGpsPoint(json.data);
  }

  return null;
}

async function getGpsHistory(deviceId) {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 60 * 1000);
  const query = `telemetry/gps/polyline?device_id=${encodeURIComponent(deviceId)}&from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
  const response = await fetch(`${BASE_URL}?path=${query}`, {
    cache: "no-store",
  });
  const json = await response.json();
  if (json.ok && json.data) {
    const items = Array.isArray(json.data.points)
      ? json.data.points
      : Array.isArray(json.data)
        ? json.data
        : [];

    return items
      .map((point) => normalizeGpsPoint(point))
      .filter(Boolean)
      .slice(-HISTORY_LIMIT);
  }

  return [];
}

export default function GpsTracking() {
  const navigate = useNavigate();
  const watchIdRef = useRef(null);
  const pollRef = useRef(null);

  const [deviceId] = useState(getOrCreateGpsDeviceId);
  const [isTracking, setIsTracking] = useState(false);
  const [status, setStatus] = useState("Siap untuk mengambil GPS.");
  const [statusType, setStatusType] = useState("idle");
  const [latestPoint, setLatestPoint] = useState(null);
  const [, setCurrentPoint] = useState(null);
  const [history, setHistory] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

  const handlePosition = useCallback(
    (position) => {
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
      uploadPoint(point);
    },
    [uploadPoint],
  );

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
        setStatus("GPS aktif. Memulai pemantauan...");
        setStatusType("tracking");
        uploadPoint(point);

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
  }, [handlePosition, uploadPoint]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    setIsTracking(false);
    setStatus("Tracking GPS dihentikan.");
    setStatusType("idle");
  }, []);

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
            <p className="gps-brand-title">GPS Tracker</p>
            <p className="gps-brand-sub">Client Panel</p>
          </div>
        </div>

        {/* Device info */}
        <div className="gps-sidebar-section">
          <p className="gps-section-label">Device</p>
          <div className="gps-device-card">
            <p className="gps-device-card-label">Device ID</p>
            <p className="gps-device-card-value">{deviceId}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="gps-stats-grid">
          <div className="gps-stat-card">
            <p className="gps-stat-label">Status</p>
            <p className={`gps-stat-value ${isTracking ? "gps-stat-active" : ""}`}>
              {isTracking ? "Aktif" : "Idle"}
            </p>
          </div>
          <div className="gps-stat-card">
            <p className="gps-stat-label">Titik</p>
            <p className="gps-stat-value">{history.length}</p>
          </div>
          <div className="gps-stat-card gps-stat-full">
            <p className="gps-stat-label">Akurasi Terakhir</p>
            <p className="gps-stat-value gps-stat-sm">
              {latestPoint?.accuracy_m != null
                ? `${latestPoint.accuracy_m.toFixed(1)} m`
                : "-"}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="gps-sidebar-section">
          <p className="gps-section-label">Kontrol</p>
          <div className="gps-action-stack">
            {!isTracking ? (
              <button
                type="button"
                className="gps-btn gps-btn-start"
                onClick={startTracking}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Mulai GPS
              </button>
            ) : (
              <button
                type="button"
                className="gps-btn gps-btn-stop"
                onClick={stopTracking}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
                Stop GPS
              </button>
            )}

            <button
              type="button"
              className="gps-btn gps-btn-secondary"
              onClick={refreshRemoteData}
              disabled={isSending}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
              Refresh Data
            </button>
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
        {/* Topbar */}
        <div className="gps-topbar">
          <div>
            <h1 className="gps-page-title">GPS Tracking</h1>
            <p className="gps-page-sub">
              Kirim lokasi periodik ke server · 30 menit terakhir
            </p>
          </div>
          <div className={`gps-live-badge ${statusType}`}>
            <span className={`gps-live-dot ${isSending ? "loading" : ""} ${statusType}`} />
            {isTracking ? "Tracking" : "Idle"}
          </div>
        </div>

        <div className="gps-content">
          {/* Status banner */}
          <div className={`gps-status-banner gps-status-banner--${statusType}`}>
            <div className="gps-status-icon">
              {statusType === "tracking" && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              )}
              {statusType === "error" && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              )}
              {statusType === "idle" && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
            </div>
            <div className="gps-status-text">
              <p className="gps-status-main">{status}</p>
              {errorMessage && <p className="gps-status-err">{errorMessage}</p>}
              {isSending && (
                <p className="gps-status-sub">Mengirim titik GPS...</p>
              )}
            </div>
          </div>

          {/* Coordinate display */}
          <div className="gps-coord-grid">
            <div className="gps-coord-card">
              <p className="gps-coord-label">Latitude</p>
              <p className="gps-coord-value">
                {latestPoint ? latestPoint.lat.toFixed(6) : "—"}
              </p>
            </div>
            <div className="gps-coord-card">
              <p className="gps-coord-label">Longitude</p>
              <p className="gps-coord-value">
                {latestPoint ? latestPoint.lng.toFixed(6) : "—"}
              </p>
            </div>
            <div className="gps-coord-card">
              <p className="gps-coord-label">Accuracy</p>
              <p className="gps-coord-value">
                {latestPoint?.accuracy_m != null
                  ? `${latestPoint.accuracy_m.toFixed(1)} m`
                  : "—"}
              </p>
            </div>
          </div>

          {/* Notifikasi GPS Active / Inactive */}
          {isTracking ? (
            <div className="gps-notice gps-notice--active">
              <div className="gps-notice-pulse">
                <span className="gps-notice-pulse-ring" />
                <span className="gps-notice-pulse-dot" />
              </div>
              <div className="gps-notice-text">
                <p className="gps-notice-title">GPS Tracking Sedang Aktif</p>
                <p className="gps-notice-desc">
                  Lokasi Anda sedang dikirim ke server secara periodik. Jangan
                  tutup halaman ini agar tracking tetap berjalan. Tekan tombol
                  <strong> Stop GPS </strong>
                  di panel kiri untuk menghentikan.
                </p>
              </div>
            </div>
          ) : (
            <div className="gps-notice gps-notice--idle">
              <div className="gps-notice-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div className="gps-notice-text">
                <p className="gps-notice-title">GPS Tracking Belum Aktif</p>
                <p className="gps-notice-desc">
                  Tekan tombol <strong>Mulai GPS</strong> di panel kiri untuk
                  mulai mengirimkan lokasi Anda ke server.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
