import { useState, useEffect , useRef } from "react";
import { CurrentUserProvider, useCurrentUser } from "./CurrentUserContext";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Header from "./layout/Header";
import Sidebar from "./layout/Sidebar";
import Dashboard from "./pages/Dashboard";
import CompanyAssets from "./pages/CompanyAssets";
import Employee from "./pages/Employee";
import Clients from "./pages/Clients";
import UnitSpecs from "./pages/UnitSpecs";
import UserManagement from "./pages/UserManagement";
import { SnackbarProvider, SnackbarContainer } from "./components/Snackbar";
// ...existing code...
import LoginPage from "./pages/LoginPage";
import "./App.css";

function App() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState("");

  return (
    <CurrentUserProvider>
      <AppContent
        navigate={navigate}
        isAuthenticated={isAuthenticated}
        setIsAuthenticated={setIsAuthenticated}
        loginError={loginError}
        setLoginError={setLoginError}
      />
    </CurrentUserProvider>
  );
  // ...existing code...

  function AppContent({
    navigate,
    isAuthenticated,
    setIsAuthenticated,
    loginError,
    setLoginError,
  }) {
    const { currentUser, setCurrentUser } = useCurrentUser();
    function onLogout() {
      setCurrentUser(null);
      setIsAuthenticated(false);
      setLoginError("");
      navigate("/login", { replace: true });
    }
    function handleLogin(userData, userId) {
      if (!userData || !userData.email) {
        setLoginError("Invalid email or password.");
        setIsAuthenticated(false);
        setCurrentUser(null);
        return;
      }
      setCurrentUser({ ...userData, uid: userId });
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
            </Routes>
          </main>
        </div>
        <SnackbarContainer />
      </SnackbarProvider>
    );
  }
}

export default App;
