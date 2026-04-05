export function GpsAdminMenu({ handleNavigation }) {
  return (
    <>
      <div className="menu-btn" onClick={() => handleNavigation("/gps-admin")}>
        <div className="menu-icon">📊</div>
        <h3>Admin GPS</h3>
        <p>Monitoring lokasi client</p>
      </div>
    </>
  );
}
