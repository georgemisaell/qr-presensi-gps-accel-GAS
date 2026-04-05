import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/dashboard/Dashboard";
import CheckIn from "./pages/checkin/CheckIn";
import Admin from "./pages/admin/Admin";
import Accelerometer from "./pages/accel/Accelerometer";
import AccelAdmin from "./pages/accel-admin/AccelAdmin";
import GpsTracking from "./pages/gps/GpsTracking";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/client" element={<CheckIn />} />
        <Route path="/accelerometer" element={<Accelerometer />} />
        <Route path="/accel-admin" element={<AccelAdmin />} />
        <Route path="/gps" element={<GpsTracking />} />
      </Routes>
    </Router>
  );
}
