import { useState, useEffect, useRef } from "react";
import { CurrentUserProvider, useCurrentUser } from "./CurrentUserContext";
import { ThemeProvider } from "./context/ThemeContext";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import Header from "./layout/Header";
import Sidebar from "./layout/Sidebar";
import Dashboard from "./pages/Dashboard";
import CompanyAssets from "./pages/CompanyAssets";
import Employee from "./pages/Employee";
import Clients from "./pages/Clients";
import UnitSpecs from "./pages/UnitSpecs";
import UserManagement from "./pages/UserManagement";
import UserLogs from "./pages/UserLogs";
import { SnackbarProvider, SnackbarContainer } from "./components/Snackbar";
import LastTagsFloatingWindow from "./components/LastTagsFloatingWindow";
// ...existing code...
import LoginPage from "./pages/LoginPage";
import "./App.css";
import "./styles/theme.css";

function App() {
  const navigate = useNavigate();
  // Initialize auth state from persisted currentUser (localStorage) so refresh keeps the user logged in
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return !!localStorage.getItem("currentUser");
    } catch (e) {
      return false;
    }
  });
  const [loginError, setLoginError] = useState("");

  return (
    <ThemeProvider>
      <CurrentUserProvider>
        <AppContent
          navigate={navigate}
          isAuthenticated={isAuthenticated}
          setIsAuthenticated={setIsAuthenticated}
          loginError={loginError}
          setLoginError={setLoginError}
        />
      </CurrentUserProvider>
    </ThemeProvider>
  );
}

function AppContent({
  navigate,
  isAuthenticated,
  setIsAuthenticated,
  loginError,
  setLoginError,
}) {
  const { currentUser, setCurrentUser } = useCurrentUser();
  const location = useLocation();

  // If we have a persisted currentUser but auth flag is false (e.g., after hard refresh), restore it
  useEffect(() => {
    if (currentUser && !isAuthenticated) {
      setIsAuthenticated(true);
    }
  }, [currentUser, isAuthenticated, setIsAuthenticated]);

  // Prevent staying on /login when already authenticated (e.g., user manually navigates back)
  useEffect(() => {
    if (isAuthenticated && location.pathname === "/login") {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);
  function onLogout() {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setLoginError("");
    try {
      localStorage.removeItem("currentUser");
    } catch (e) {
      // ignore storage errors
    }
    navigate("/login", { replace: true });
  }
  function handleLogin(userData, userId) {
    if (!userData || !userData.email) {
      setLoginError("Invalid email or password.");
      setIsAuthenticated(false);
      setCurrentUser(null);
      return;
    }
    const userWithId = { ...userData, uid: userId };
    console.log("Setting currentUser with data:", userWithId); // Debug log
    console.log("Username field:", userWithId.username); // Debug log
    setCurrentUser(userWithId);
    setIsAuthenticated(true);
    setLoginError("");
    navigate("/dashboard", { replace: true });
  }
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} error={loginError} />;
  }
  return (
    <SnackbarProvider>
      <Header onLogout={onLogout} />
      <div className="app-main">
        <Sidebar className="sidebar" />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/company-assets" element={<CompanyAssets />} />
            <Route path="/employees" element={<Employee />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/unit-specs" element={<UnitSpecs />} />
            <Route path="/user-management" element={<UserManagement />} />
            <Route path="/user-logs" element={<UserLogs />} />
          </Routes>
        </main>
      </div>
      <SnackbarContainer />
      <LastTagsFloatingWindow />
    </SnackbarProvider>
  );
}

export default App;
