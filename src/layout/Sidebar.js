import { Link } from "react-router-dom";

function Sidebar() {
  return (
    <nav style={{ background: "darkgray", minHeight: "100vh", padding: 16 }}>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        <li style={{ marginBottom: 12 }}>
          <Link to="/">Dashboard</Link>
        </li>
        <li style={{ marginBottom: 12 }}>
          <Link to="/assets">Assets</Link>
        </li>
        <li style={{ marginBottom: 12 }}>
          <Link to="/inventory">Inventory</Link>
        </li>
        <li style={{ marginBottom: 12 }}>
          <Link to="/employees">Employees</Link>
        </li>
        <li>
          <Link to="/clients">Clients</Link>
        </li>
      </ul>
    </nav>
  );
}

export default Sidebar;
