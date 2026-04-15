import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chart from "chart.js/auto";
import { BASE_URL } from "../../Api";
import "./AccelAdmin.css";

const POLL_INTERVAL_MS = 3000;
const HISTORY_INTERVAL_MS = 5000;
const MAX_CHART_POINTS = 60;
const MAX_TABLE_ROWS = 50;

export default function AccelAdmin() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const [deviceIdInput, setDeviceIdInput] = useState("");
  const [activeDeviceId, setActiveDeviceId] = useState("");
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [latestData, setLatestData] = useState(null);
  const [tableRows, setTableRows] = useState([]);
  const [statusMsg, setStatusMsg] = useState("Masukkan Device ID lalu tekan Mulai Monitor.");
  const [statusType, setStatusType] = useState("idle");
  const [lastUpdated, setLastUpdated] = useState(null);

  const pollLatestRef = useRef(null);
  const pollHistoryRef = useRef(null);
  const isMonitoringRef = useRef(false);
  const lastChartTsRef = useRef(null);

  const appendLatestToTable = useCallback((d) => {
    setTableRows((prev) => {
      if (prev.length > 0 && prev[0].t === d.t) return prev;
      return [{ ...d, _key: `${d.t}-${Date.now()}` }, ...prev].slice(0, MAX_TABLE_ROWS);
    });
  }, []);

  const fetchLatestWithFallback = useCallback(async (devId) => {
    try {
      const query = new URLSearchParams({
        path: "telemetry/accel/latest",
        device_id: devId,
        _t: String(Date.now()),
      });
      const res = await fetch(`${BASE_URL}?${query.toString()}`, { cache: "no-store" });
      const json = await res.json();

      if (json.ok && json.data) {
        const d = json.data;
        setLatestData(d);
        setLastUpdated(new Date());
        setStatusMsg(`✅ Live API — device: ${devId}`);
        setStatusType("active");

        const chart = chartRef.current;
        if (chart && d.t !== lastChartTsRef.current) {
          lastChartTsRef.current = d.t;
          const label = d.t
            ? new Date(d.t).toLocaleTimeString("id-ID", { hour12: false })
            : new Date().toLocaleTimeString("id-ID", { hour12: false });
          chart.data.labels.push(label);
          chart.data.datasets[0].data.push(d.x ?? 0);
          chart.data.datasets[1].data.push(d.y ?? 0);
          chart.data.datasets[2].data.push(d.z ?? 0);
          if (chart.data.labels.length > MAX_CHART_POINTS) {
            chart.data.labels.shift();
            chart.data.datasets.forEach((ds) => ds.data.shift());
          }
          chart.update("none");
        }
        appendLatestToTable(d);
      } else {
        setStatusMsg(`⚠️ Belum ada data untuk device: ${devId}`);
        setStatusType("warning");
      }
    } catch (err) {
      console.error("Poll latest error:", err);
      setStatusMsg("❌ Gagal terhubung ke server GAS.");
      setStatusType("error");
    }
  }, [appendLatestToTable]);

  const fetchHistory = useCallback(async (devId) => {
    try {
      const query = new URLSearchParams({
        path: "telemetry/accel/history",
        device_id: devId,
        limit: String(MAX_TABLE_ROWS),
        _t: String(Date.now()),
      });
      const res = await fetch(`${BASE_URL}?${query.toString()}`, { cache: "no-store" });
      const json = await res.json();

      if (json.ok && json.data) {
        const raw = json.data.items ?? json.data.samples ?? (Array.isArray(json.data) ? json.data : null);
        if (Array.isArray(raw) && raw.length > 0) {
          const sorted = [...raw]
            .sort((a, b) => new Date(b.t) - new Date(a.t))
            .slice(0, MAX_TABLE_ROWS)
            .map((r, i) => ({ ...r, _key: `hist-${r.t}-${i}` }));
          setTableRows(sorted);
        }
      }
    } catch (err) {
      console.warn("History endpoint error:", err);
    }
  }, []);

  const startMonitor = useCallback(() => {
    const id = deviceIdInput.trim();
    if (!id) {
      setStatusMsg("⚠️ Device ID tidak boleh kosong.");
      setStatusType("warning");
      return;
    }
    setActiveDeviceId(id);
    isMonitoringRef.current = true;
    setIsMonitoring(true);
    setTableRows([]);
    setLatestData(null);
    lastChartTsRef.current = null;
    setStatusMsg(`🔄 Menghubungkan API ke: ${id} ...`);
    setStatusType("connecting");

    const chart = chartRef.current;
    if (chart) {
      chart.data.labels = [];
      chart.data.datasets.forEach((ds) => (ds.data = []));
      chart.update("none");
    }

    fetchLatestWithFallback(id);
    fetchHistory(id);

    pollLatestRef.current = setInterval(() => {
      if (isMonitoringRef.current) fetchLatestWithFallback(id);
    }, POLL_INTERVAL_MS);

    pollHistoryRef.current = setInterval(() => {
      if (isMonitoringRef.current) fetchHistory(id);
    }, HISTORY_INTERVAL_MS);
  }, [deviceIdInput, fetchLatestWithFallback, fetchHistory]);

  const stopMonitor = useCallback(() => {
    isMonitoringRef.current = false;
    setIsMonitoring(false);
    clearInterval(pollLatestRef.current);
    clearInterval(pollHistoryRef.current);
    setStatusMsg("Monitor dihentikan.");
    setStatusType("stopped");
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          { label: "X", borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,0.07)", data: [], tension: 0.35, pointRadius: 0, borderWidth: 2.5, fill: true },
          { label: "Y", borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.07)", data: [], tension: 0.35, pointRadius: 0, borderWidth: 2.5, fill: true },
          { label: "Z", borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.07)", data: [], tension: 0.35, pointRadius: 0, borderWidth: 2.5, fill: true },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          x: { display: true, ticks: { maxTicksLimit: 8, color: "#94a3b8", font: { size: 10 }, maxRotation: 0 }, grid: { color: "rgba(148,163,184,0.15)" } },
          y: { suggestedMin: -15, suggestedMax: 15, grid: { color: "rgba(148,163,184,0.2)" }, ticks: { color: "#94a3b8", font: { size: 11 } } },
        },
        plugins: {
          legend: { position: "top", labels: { usePointStyle: true, boxWidth: 9, color: "#334155", font: { size: 12, weight: "600" } } },
          tooltip: { backgroundColor: "rgba(15,23,42,0.88)", titleColor: "#e2e8f0", bodyColor: "#cbd5e1", padding: 10, cornerRadius: 8 },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      clearInterval(pollLatestRef.current);
      clearInterval(pollHistoryRef.current);
      isMonitoringRef.current = false;
    };
  }, []);

  const mag = latestData
    ? Math.sqrt((latestData.x ?? 0) ** 2 + (latestData.y ?? 0) ** 2 + (latestData.z ?? 0) ** 2).toFixed(3)
    : "—";

  return (
    <div className="aa-page">
      <div className="aa-topnav">
        <button type="button" className="aa-back-btn" onClick={() => { stopMonitor(); navigate("/"); }}>
          ← Kembali ke Dashboard
        </button>
        <span className="aa-badge">Admin Monitor API</span>
      </div>

      <div className="aa-wrap fade-in">
        <h1 className="aa-title">📊 Admin Accelerometer</h1>
        <p className="aa-subtitle">Monitor data sensor secara live (Real-time via GAS API)</p>

        <div className="aa-control-row">
          <input
            type="text"
            className="aa-input"
            placeholder="Masukkan Device ID klien (contoh: DEV-AB12CD)"
            value={deviceIdInput}
            onChange={(e) => setDeviceIdInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !isMonitoring) startMonitor(); }}
            disabled={isMonitoring}
          />
          {!isMonitoring ? (
            <button type="button" className="aa-btn aa-btn--start" onClick={startMonitor}>▶ Mulai Monitor</button>
          ) : (
            <button type="button" className="aa-btn aa-btn--stop" onClick={stopMonitor}>■ Stop</button>
          )}
        </div>

        <div className={`aa-status aa-status--${statusType}`}>{statusMsg}</div>

        <div className="aa-value-row">
          {[
            { axis: "X", val: latestData?.x, color: "#ef4444", bg: "#fff5f5" },
            { axis: "Y", val: latestData?.y, color: "#10b981", bg: "#f0fdf8" },
            { axis: "Z", val: latestData?.z, color: "#3b82f6", bg: "#eff6ff" },
            { axis: "|a|", val: mag, color: "#8b5cf6", bg: "#f5f3ff", isMag: true },
          ].map(({ axis, val, color, bg, isMag }) => (
            <div className="aa-val-card" key={axis} style={{ background: bg, borderColor: color + "33" }}>
              <div className="aa-val-axis" style={{ color }}>{axis}</div>
              <div className="aa-val-num" style={{ color: isMag ? color : undefined }}>
                {val !== null && val !== undefined ? (typeof val === "number" ? val.toFixed(3) : val) : "—"}
              </div>
              <div className="aa-val-unit">m/s²</div>
            </div>
          ))}
        </div>

        {lastUpdated && (
          <div className="aa-last-updated">
            Terakhir diperbarui: {lastUpdated.toLocaleTimeString("id-ID", { hour12: false })}
            {activeDeviceId && (<>{" "}· Device: <strong>{activeDeviceId}</strong></>)}
          </div>
        )}

        <div className="aa-section">
          <div className="aa-section-header">
            <span className="aa-section-title">Grafik Live (X / Y / Z)</span>
            {isMonitoring && <span className="aa-live-dot" />}
          </div>
          <div className="aa-chart-wrap">
            <canvas ref={canvasRef} />
          </div>
        </div>

        <div className="aa-section">
          <div className="aa-section-header">
            <span className="aa-section-title">Tabel Live (maks. {MAX_TABLE_ROWS} baris terbaru)</span>
            <span className="aa-row-count">{tableRows.length} baris</span>
          </div>
          <div className="aa-table-scroll">
            <table className="aa-table">
              <thead>
                <tr>
                  <th>#</th><th>Timestamp (t)</th><th>X (m/s²)</th><th>Y (m/s²)</th><th>Z (m/s²)</th><th>|a| (m/s²)</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="aa-table-empty">
                      {isMonitoring ? "Menunggu data masuk dari API..." : "Belum ada data. Mulai monitor untuk melihat data."}
                    </td>
                  </tr>
                ) : (
                  tableRows.map((row, idx) => {
                    const magnitude = Math.sqrt((row.x ?? 0) ** 2 + (row.y ?? 0) ** 2 + (row.z ?? 0) ** 2).toFixed(3);
                    return (
                      <tr key={row._key} className={idx === 0 ? "aa-row-new" : ""}>
                        <td>{idx + 1}</td>
                        <td className="aa-ts-cell">
                          {row.t ? new Date(row.t).toLocaleString("id-ID", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
                        </td>
                        <td className="aa-x-cell">{row.x?.toFixed(3) ?? "—"}</td>
                        <td className="aa-y-cell">{row.y?.toFixed(3) ?? "—"}</td>
                        <td className="aa-z-cell">{row.z?.toFixed(3) ?? "—"}</td>
                        <td className="aa-mag-cell">{magnitude}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}