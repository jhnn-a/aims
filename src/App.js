import { useState, useEffect } from "react";
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
import { db, auth } from "./utils/firebase";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import LoginPage from "./pages/LoginPage";
import "./App.css";

function App() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const idTokenResult = await firebaseUser.getIdTokenResult(true);
        const claims = idTokenResult.claims;
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        let userData = { uid: firebaseUser.uid, email: firebaseUser.email };
        if (userDoc.exists()) {
          userData = { ...userDoc.data(), ...userData };
        }
        setUser({ ...userData, ...claims });
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  async function handleLogin(email, password) {
    if (!email && !password) {
      setLoginError("Email and password are required.");
      return;
    }
    if (!email) {
      setLoginError("Email is required.");
      return;
    }
    if (!password) {
      setLoginError("Password is required.");
      return;
    }
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const idTokenResult = await cred.user.getIdTokenResult(true);
      const claims = idTokenResult.claims;
      const userDoc = await getDoc(doc(db, "users", cred.user.uid));
      let userData = { uid: cred.user.uid, email: cred.user.email };
      if (userDoc.exists()) {
        userData = { ...userDoc.data(), ...userData };
      }
      setUser({ ...userData, ...claims });
      setIsAuthenticated(true);
      setLoginError("");
      navigate("/dashboard", { replace: true });
    } catch {
      setLoginError("Invalid email or password.");
    }
  }

  if (authLoading) {
    return (
      <div
        className="loading-container"
        style={{
          background: "#F9F9F9",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Joii logo removed from loading screen */}
        <div
          className="loading-spinner"
          style={{
            width: 48,
            height: 48,
            border: "3px solid #e0e7ef",
            borderTop: "3px solid #2563EB",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            marginBottom: 0,
            background: "none",
          }}
        />
        {/* Removed Loading... text */}
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} error={loginError} />;
  }

  return (
    <SnackbarProvider>
      <Header user={user} />
      <div className="app-main">
        <Sidebar user={user} className="sidebar" />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard user={user} />} />
            <Route
              path="/company-assets"
              element={<CompanyAssets user={user} />}
            />
            <Route path="/employees" element={<Employee user={user} />} />
            <Route path="/clients" element={<Clients user={user} />} />
            <Route path="/unit-specs" element={<UnitSpecs user={user} />} />
            <Route
              path="/user-management"
              element={<UserManagement currentUser={user} />}
            />
          </Routes>
        </main>
      </div>
      <SnackbarContainer />
    </SnackbarProvider>
  );
}

export default App;
