import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/dashboard/Dashboard";
import CheckIn from "./pages/CheckIn";
import Admin from "./pages/Admin";
import Accelerometer from "./pages/Accelerometer";
import GpsTracking from "./pages/GpsTracking";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/client" element={<CheckIn />} />
        <Route path="/accelerometer" element={<Accelerometer />} />
        <Route path="/gps" element={<GpsTracking />} />
      </Routes>
    </Router>
  );
}
