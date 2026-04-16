import { useNavigate } from "react-router-dom";

export default function GpsPlaceholder() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1rem" }}>
      <div
        style={{
          maxWidth: "560px",
          width: "100%",
          border: "1px solid #dbeafe",
          borderRadius: "16px",
          background: "#fff",
          padding: "1.25rem",
          boxShadow: "0 18px 36px rgba(30,64,175,0.1)",
          fontFamily: "Segoe UI, system-ui, sans-serif",
        }}
      >
        <h2 style={{ marginTop: 0, color: "#1e3a8a" }}>Menu GPS</h2>
        <p style={{ color: "#475569", lineHeight: 1.5 }}>
          Halaman ini disiapkan untuk pengembangan modul GPS berikutnya. Untuk saat
          ini fokus sistem ada pada Dosen (Generate QR) dan Mahasiswa (Scan QR).
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            border: "1px solid #bfdbfe",
            borderRadius: "10px",
            padding: "0.55rem 0.9rem",
            background: "#eff6ff",
            color: "#1d4ed8",    
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Kembali ke Dashboard
        </button>
      </div>
    </div>
  );
}
