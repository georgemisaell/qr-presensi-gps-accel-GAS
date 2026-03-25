export function MahasiswaMenu({ handleNavigation }) {
  return (
    <div className="menu-btn" onClick={() => handleNavigation("/client")}>
      <div className="menu-icon">📱</div>
      <h3>Mahasiswa</h3>
      <p>Scan QR Code dan catat kehadiran Anda untuk sesi ini.</p>
    </div>
  );
}
