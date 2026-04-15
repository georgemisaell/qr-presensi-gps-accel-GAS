export function AccelAdminMenu({ handleNavigation }) {
  return (
    <>
      <div className="menu-btn" onClick={() => handleNavigation("/admin")}>
        <div className="menu-icon">📊</div>
        <h3>Admin Accelerometer</h3>
        <p>Monitor grafik &amp; tabel data sensor secara live dari semua device.</p>
      </div>
    </>
  );
}
