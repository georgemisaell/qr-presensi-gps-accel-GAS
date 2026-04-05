import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chart from "chart.js/auto";
import "./AccelAdmin.css";

// Masukkan link CSV publik kamu di sini
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTsFoXju_o_UqDfM5W4BEwxlC1o8VqrPPUfuhfDUcv3a_LRQ2_zeQx5d1OBbveGXhlYfQyK2LueRO65/pub?gid=1920677518&single=true&output=csv";

const POLL_INTERVAL_MS = 3000;
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

  const pollCsvRef = useRef(null);
  const isMonitoringRef = useRef(false);
  const lastChartTsRef = useRef(null);

  // Fungsi untuk mem-parsing teks CSV menjadi array object
  const parseCSV = (csvText, devId) => {
    // Pisahkan baris
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== "");
    if (lines.length <= 1) return []; // Hanya header atau kosong

    const parsedData = [];
    // Looping dari bawah (terbaru) ke atas (terlama)
    for (let i = lines.length - 1; i >= 1; i--) {
      // Asumsi format kolom: [device_id, x, y, z, sample_ts, batch_ts, recorded_at]
      const cols = lines[i].split(",");
      if (cols.length < 6) continue;
      
      const rowDevId = cols[0].trim();
      if (rowDevId === devId) {
        parsedData.push({
          x: parseFloat(cols[1]) || 0,
          y: parseFloat(cols[2]) || 0,
          z: parseFloat(cols[3]) || 0,
          t: cols[4] || cols[5], // Pakai sample_ts, kalau kosong pakai batch_ts
        });
      }
    }
    return parsedData;
  };

  // Fetch data langsung dari CSV Google Sheets
  const fetchDataFromCSV = useCallback(async (devId) => {
    try {
      // Tambahkan parameter _t agar tidak kena cache browser
      const url = `${CSV_URL}&_t=${Date.now()}`;
      const res = await fetch(url, { cache: "no-store" });
      const text = await res.text();

      const allDeviceData = parseCSV(text, devId);

      if (allDeviceData.length > 0) {
        const latest = allDeviceData[0]; // Data paling atas (karena di-loop mundur)

        setLatestData(latest);
        setLastUpdated(new Date());
        setStatusMsg(`✅ Live — device: ${devId}`);
        setStatusType("active");

        // Update grafik hanya kalau timestamp baru
        const chart = chartRef.current;
        if (chart && latest.t !== lastChartTsRef.current) {
          lastChartTsRef.current = latest.t;
          const label = latest.t
            ? new Date(latest.t).toLocaleTimeString("id-ID", { hour12: false })
            : new Date().toLocaleTimeString("id-ID", { hour12: false });
          
          chart.data.labels.push(label);
          chart.data.datasets[0].data.push(latest.x);
          chart.data.datasets[1].data.push(latest.y);
          chart.data.datasets[2].data.push(latest.z);
          
          if (chart.data.labels.length > MAX_CHART_POINTS) {
            chart.data.labels.shift();
            chart.data.datasets.forEach((ds) => ds.data.shift());
          }
          chart.update("none");
        }

        // Update Tabel (ambil sesuai maksimal baris)
        const topTableData = allDeviceData.slice(0, MAX_TABLE_ROWS).map((r, i) => ({
          ...r,
          _key: `csv-${r.t}-${i}`
        }));
        setTableRows(topTableData);

      } else {
        setStatusMsg(`⚠️ Belum ada data untuk device: ${devId}`);
        setStatusType("warning");
      }
    } catch (err) {
      console.error("Fetch CSV error:", err);
      setStatusMsg("❌ Gagal membaca CSV Google Sheets.");
      setStatusType("error");
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
    setStatusMsg(`🔄 Membaca data langsung dari Google Sheets: ${id} ...`);
    setStatusType("connecting");

    const chart = chartRef.current;
    if (chart) {
      chart.data.labels = [];
      chart.data.datasets.forEach((ds) => (ds.data = []));
      chart.update("none");
    }

    // Fetch langsung pertama kali
    fetchDataFromCSV(id);

    // Polling setiap 3 detik
    pollCsvRef.current = setInterval(() => {
      if (isMonitoringRef.current) fetchDataFromCSV(id);
    }, POLL_INTERVAL_MS);

  }, [deviceIdInput, fetchDataFromCSV]);

  const stopMonitor = useCallback(() => {
    isMonitoringRef.current = false;
    setIsMonitoring(false);
    clearInterval(pollCsvRef.current);
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
      clearInterval(pollCsvRef.current);
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
        <span className="aa-badge">Admin Monitor (CSV Direct)</span>
      </div>

      <div className="aa-wrap fade-in">
        <h1 className="aa-title">📊 Admin Accelerometer</h1>
        <p className="aa-subtitle">Monitor data sensor secara live (Bypass via Google Sheets)</p>

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
                      {isMonitoring ? "Menunggu data masuk dari Google Sheets..." : "Belum ada data. Mulai monitor untuk melihat data."}
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