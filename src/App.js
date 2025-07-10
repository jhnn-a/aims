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
import { db, auth } from "./utils/firebase";
import {
  signInWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

function Login({ onLogin, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const styles = {
    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "#233037f2",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2000,
    },
    modalContent: {
      background: "#fff",
      padding: "36px 40px",
      borderRadius: 18,
      minWidth: 340,
      maxWidth: 420,
      boxShadow: "0 12px 48px rgba(37,99,235,0.18)",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 18,
    },
    title: {
      margin: "0 0 18px 0",
      fontWeight: 800,
      color: "#233037",
      letterSpacing: 0.5,
      fontSize: 20,
      textAlign: "center",
      fontFamily: "Segoe UI, Arial, sans-serif",
      lineHeight: 1.3,
    },
    input: {
      padding: "10px 14px",
      borderRadius: 8,
      border: "1px solid #cbd5e1",
      fontSize: 16,
      background: "#fff",
      minWidth: 220,
      marginRight: 0,
      width: "100%",
      color: "#233037",
      outline: "none",
      marginBottom: 2,
      transition: "border 0.2s",
    },
    actionBtn: {
      background: "#70C1B3",
      color: "#233037",
      border: "none",
      borderRadius: 8,
      padding: "10px 22px",
      fontWeight: 700,
      fontSize: 15,
      cursor: "pointer",
      marginLeft: 0,
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      transition: "background 0.2s, box-shadow 0.2s",
      width: "100%",
      marginTop: 2,
    },
    error: {
      color: "#F25F5C",
      textAlign: "center",
      fontWeight: 600,
      fontSize: 14,
      marginTop: -8,
      marginBottom: -8,
    },
  };
  return (
    <div style={styles.modalOverlay}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onLogin(email, password);
        }}
        style={styles.modalContent}
      >
        <h2 style={styles.title}>
          JOII IT Assets & Inventory
          <br />
          Management System
        </h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
          autoFocus
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />
        {error && <div style={styles.error}>{error}</div>}
        <button type="submit" style={styles.actionBtn}>
          Login
        </button>
      </form>
    </div>
  );
}

function DebugClaims() {
  useEffect(() => {
    const auth = getAuth();
    if (auth.currentUser) {
      auth.currentUser.getIdTokenResult(true).then((idTokenResult) => {
        console.log("Custom Claims:", idTokenResult.claims);
      });
    }
  }, []);
  return null;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); // NEW
  const [redirectToDashboard, setRedirectToDashboard] = useState(false); // NEW

  // Persist login state using Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch custom claims
        const idTokenResult = await firebaseUser.getIdTokenResult(true);
        const claims = idTokenResult.claims;
        // Optionally fetch Firestore user data
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
      setAuthLoading(false); // NEW
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (email, password) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      // Fetch custom claims from Firebase Auth
      const idTokenResult = await cred.user.getIdTokenResult(true);
      const claims = idTokenResult.claims;
      // Optionally fetch Firestore user data
      const userDoc = await getDoc(doc(db, "users", cred.user.uid));
      let userData = { uid: cred.user.uid, email: cred.user.email };
      if (userDoc.exists()) {
        userData = { ...userDoc.data(), ...userData };
      }
      // Merge custom claims into user object
      setUser({ ...userData, ...claims });
      setIsAuthenticated(true);
      setLoginError("");
      setRedirectToDashboard(true); // NEW
    } catch (err) {
      setLoginError("Invalid email or password.");
    }
  };

  useEffect(() => {
    if (redirectToDashboard) {
      setRedirectToDashboard(false);
      // REMOVE: navigate("/dashboard", { replace: true });
    }
  }, [redirectToDashboard]);

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1D2435",
          flexDirection: "column",
        }}
      >
        <img
          src={require("./layout/joii.png")}
          alt="JOII Logo"
          style={{
            height: 40,
            width: "auto",
            marginBottom: 24,
            filter: "drop-shadow(0 4px 16px #0006)",
          }}
        />
        <div
          style={{
            width: 38,
            height: 38,
            border: "4px solid #FFE066",
            borderTop: "4px solid #1D2435",
            borderRadius: "50%",
            animation: "joii-spin 1s linear infinite",
            marginBottom: 18,
          }}
        />
        <style>{`
          @keyframes joii-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div
          style={{
            fontSize: 18,
            color: "#FFE066",
            fontWeight: 700,
            letterSpacing: 1.2,
            textShadow: "0 2px 8px #0005",
          }}
        >
          Loading...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} error={loginError} />;
  }

  if (redirectToDashboard) {
    setRedirectToDashboard(false);
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <Header user={user} />
      <div style={{ display: "flex" }}>
        <Sidebar user={user} />
        <main
          style={{
            flex: 1,
            padding: 16,
            backgroundColor: "#F9F9F9",
            minHeight: "100vh",
            width: "100vw",
            boxSizing: "border-box",
          }}
        >
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard user={user} />} />
            <Route path="/company-assets" element={<CompanyAssets user={user} />} />
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
      <DebugClaims />
    </>
  );
}

export default App;
