export function AccelAdminMenu({ handleNavigation }) {
    return (
      <div
        className="menu-btn menu-btn--accent-admin"
        onClick={() => handleNavigation("/accel-admin")}
      >
        <div className="menu-icon menu-icon--admin">📊</div>
        <h3>Admin Accelerometer</h3>
        <p>Monitor grafik &amp; tabel data sensor secara live dari semua device.</p>
      </div>
    );
  }
  