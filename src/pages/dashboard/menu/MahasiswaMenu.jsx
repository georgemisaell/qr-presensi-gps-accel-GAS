export function MahasiswaMenu({ handleNavigation }) {
  return (
    <div className="menu-btn" onClick={() => handleNavigation("/client")}>
      <div className="menu-icon">📱</div>
      <h3>Mahasiswa</h3>
      <p>Scan QR dan kirim check-in (user_id, device_id, qr_token, ts).</p>
    </div>
  );
}
