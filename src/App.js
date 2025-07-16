import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./layout/Header";
import Sidebar from "./layout/Sidebar";
import Dashboard from "./pages/Dashboard";
import CompanyAssets from "./pages/CompanyAssets";
import Employees from "./pages/Employees";
import Clients from "./pages/Clients";
import UnitSpecs from "./pages/UnitSpecs";
import UserManagement from "./pages/UserManagement";
import { SnackbarProvider, SnackbarContainer } from "./components/Snackbar";
import { db, auth } from "./utils/firebase";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import LoginPage from "./pages/LoginPage";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [redirectToDashboard, setRedirectToDashboard] = useState(false);

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
      setRedirectToDashboard(true);
    } catch (err) {
      setLoginError("Invalid email or password.");
    }
  }

  useEffect(() => {
    if (redirectToDashboard) {
      setRedirectToDashboard(false);
    }
  }, [redirectToDashboard]);

  if (authLoading) {
    const loadingStyles = {
      container: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1D2435",
        flexDirection: "column",
      },
      logo: {
        height: 40,
        width: "auto",
        marginBottom: 24,
        filter: "drop-shadow(0 4px 16px #0006)",
      },
      spinner: {
        width: 38,
        height: 38,
        border: "4px solid #FFE066",
        borderTop: "4px solid #1D2435",
        borderRadius: "50%",
        animation: "joii-spin 1s linear infinite",
        marginBottom: 18,
      },
      loadingText: {
        fontSize: 18,
        color: "#FFE066",
        fontWeight: 700,
        letterSpacing: 1.2,
        textShadow: "0 2px 8px #0005",
      },
    };
    return (
      <div style={loadingStyles.container}>
        <img
          src={require("./layout/joii.png")}
          alt="JOII Logo"
          style={loadingStyles.logo}
        />
        <div style={loadingStyles.spinner} />
        <style>{`
          @keyframes joii-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div style={loadingStyles.loadingText}>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} error={loginError} />;
  }

  if (redirectToDashboard) {
    setRedirectToDashboard(false);
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <SnackbarProvider>
      <Header user={user} />
      <div style={{ display: "flex", marginTop: 56 }}>
        <Sidebar user={user} />
        <main
          className="main-content"
          style={{
            flex: 1,
            padding: 0,
            backgroundColor: "#F9F9F9",
            boxSizing: "border-box",
            marginLeft: 260,
            height: "calc(100vh - 56px)",
            width: "calc(100vw - 260px)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard user={user} />} />
            <Route
              path="/company-assets"
              element={<CompanyAssets user={user} />}
            />
            <Route path="/employees" element={<Employees user={user} />} />
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
