import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./layout/Header";
import Sidebar from "./layout/Sidebar";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Assets from "./pages/Assets";
import Employees from "./pages/Employees";
import Clients from "./pages/Clients"; // ✅ Added

function App() {
  return (
    <Router>
      <Header />
      <div style={{ display: "flex" }}>
        <Sidebar />
        <div style={{ flex: 1, padding: 16 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/clients" element={<Clients />} /> {/* ✅ Added */}
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
