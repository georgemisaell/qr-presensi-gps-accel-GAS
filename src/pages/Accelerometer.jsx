import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chart from "chart.js/auto";
import { BASE_URL } from "../Api";
import "./Accelerometer.css";

const MAX_DATA_POINTS = 50;
const SAMPLE_INTERVAL_MS = 200;
const BATCH_INTERVAL_MS = 3000;

function getOrCreateDeviceId() {
  let id = localStorage.getItem("gas_device_id");
  if (!id) {
    id = "DEV-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem("gas_device_id", id);
  }
  return id;
}

export default function Accelerometer() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  // Mutable refs — no re-renders needed
  const isRecordingRef = useRef(false);
  const dataBufferRef = useRef([]);
  const lastSampleTimeRef = useRef(0);
  const batchIntervalRef = useRef(null);

  // State
  const [deviceId] = useState(getOrCreateDeviceId);
  const [vals, setVals] = useState({ x: 0, y: 0, z: 0 });
  const [isRecording, setIsRecording] = useState(false);
  const [statusMsg, setStatusMsg] = useState(
    "Standby. Tekan mulai untuk merekam.",
  );
  const [statusType, setStatusType] = useState("idle");

  // ── Send batch to GAS ──────────────────────────────────────
  const sendBatchData = useCallback(() => {
    if (dataBufferRef.current.length === 0) return;
    const payload = {
      device_id: deviceId,
      ts: new Date().toISOString(),
      data: [...dataBufferRef.current],
    };
    dataBufferRef.current = [];

    fetch(`${BASE_URL}?path=sensor/accel/batch`, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
    })
      .then((r) => r.json())
      .then((res) => console.log("Batch terkirim:", res))
      .catch((err) => console.error("Gagal mengirim batch:", err));
  }, [deviceId]);

  // ── Motion handler ─────────────────────────────────────────
  const handleMotion = useCallback((event) => {
    if (!isRecordingRef.current) return;
    const now = Date.now();
    if (now - lastSampleTimeRef.current < SAMPLE_INTERVAL_MS) return;
    lastSampleTimeRef.current = now;

    const x = event.accelerationIncludingGravity?.x ?? 0;
    const y = event.accelerationIncludingGravity?.y ?? 0;
    const z = event.accelerationIncludingGravity?.z ?? 0;

    setVals({ x, y, z });

    const chart = chartRef.current;
    if (!chart) return;
    chart.data.labels.push(new Date().toLocaleTimeString());
    chart.data.datasets[0].data.push(x);
    chart.data.datasets[1].data.push(y);
    chart.data.datasets[2].data.push(z);

    if (chart.data.labels.length > MAX_DATA_POINTS) {
      chart.data.labels.shift();
      chart.data.datasets.forEach((ds) => ds.data.shift());
    }
    chart.update();

    dataBufferRef.current.push({
      x: parseFloat(x.toFixed(3)),
      y: parseFloat(y.toFixed(3)),
      z: parseFloat(z.toFixed(3)),
      ts: new Date().toISOString(),
    });
  }, []);

  // ── Stop recording ─────────────────────────────────────────
  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    window.removeEventListener("devicemotion", handleMotion);
    clearInterval(batchIntervalRef.current);
    sendBatchData();
    setIsRecording(false);
    setStatusMsg("Perekaman dihentikan.");
    setStatusType("stopped");
  }, [handleMotion, sendBatchData]);

  // ── Init Chart ─────────────────────────────────────────────
  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "X",
            borderColor: "#ef4444",
            backgroundColor: "rgba(239,68,68,0.08)",
            data: [],
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2,
          },
          {
            label: "Y",
            borderColor: "#10b981",
            backgroundColor: "rgba(16,185,129,0.08)",
            data: [],
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2,
          },
          {
            label: "Z",
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59,130,246,0.08)",
            data: [],
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: { display: false },
          y: {
            suggestedMin: -15,
            suggestedMax: 15,
            grid: { color: "#e2e8f0" },
          },
        },
        plugins: {
          legend: {
            position: "top",
            labels: { usePointStyle: true, boxWidth: 8 },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      isRecordingRef.current = false;
      window.removeEventListener("devicemotion", handleMotion);
      clearInterval(batchIntervalRef.current);
    };
  }, [handleMotion]);

  // ── Activate recording ─────────────────────────────────────
  const activateRecording = useCallback(() => {
    isRecordingRef.current = true;
    dataBufferRef.current = [];
    lastSampleTimeRef.current = 0;

    const chart = chartRef.current;
    if (chart) {
      chart.data.labels = [];
      chart.data.datasets.forEach((ds) => (ds.data = []));
      chart.update();
    }

    setIsRecording(true);
    setStatusMsg("Merekam & mengirim data...");
    setStatusType("recording");

    window.addEventListener("devicemotion", handleMotion);
    batchIntervalRef.current = setInterval(sendBatchData, BATCH_INTERVAL_MS);
  }, [handleMotion, sendBatchData]);

  // ── Start (with iOS permission request) ───────────────────
  const startRecording = useCallback(() => {
    if (
      typeof DeviceMotionEvent !== "undefined" &&
      typeof DeviceMotionEvent.requestPermission === "function"
    ) {
      DeviceMotionEvent.requestPermission()
        .then((state) => {
          if (state === "granted") activateRecording();
          else alert("Izin sensor ditolak!");
        })
        .catch(console.error);
    } else {
      activateRecording();
    }
  }, [activateRecording]);

  // ── Back ───────────────────────────────────────────────────
  const goBack = useCallback(() => {
    if (isRecordingRef.current) stopRecording();
    navigate("/");
  }, [stopRecording, navigate]);

  return (
    <div className="accel-page">
      <div className="accel-top-nav">
        <button type="button" className="accel-back-btn" onClick={goBack}>
          Kembali ke Dashboard
        </button>
      </div>

      <div className="accel-card fade-in">
        <h1 className="accel-title">Data Accelerometer</h1>
        <div className="accel-device-id">Device ID: {deviceId}</div>

        {/* Sensor value boxes */}
        <div className="accel-sensor-grid">
          {[
            { label: "X", value: vals.x, color: "#ef4444" },
            { label: "Y", value: vals.y, color: "#10b981" },
            { label: "Z", value: vals.z, color: "#3b82f6" },
          ].map(({ label, value, color }) => (
            <div className="accel-sensor-box" key={label}>
              <div className="accel-sensor-label" style={{ color }}>
                {label}
              </div>
              <div className="accel-sensor-value">{value.toFixed(2)}</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="accel-chart-wrap">
          <canvas ref={canvasRef} />
        </div>

        {/* Buttons */}
        {!isRecording ? (
          <button
            type="button"
            className="accel-btn accel-btn-start"
            onClick={startRecording}
          >
            Mulai Perekaman
          </button>
        ) : (
          <button
            type="button"
            className="accel-btn accel-btn-stop"
            onClick={stopRecording}
          >
            Berhenti
          </button>
        )}

        {/* Status */}
        <p className={`accel-status accel-status--${statusType}`}>
          {statusMsg}
        </p>
      </div>
    </div>
  );
}
