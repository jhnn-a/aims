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

// --- Login Component ---
function Login({ onLogin, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState(error);
  const [showPassword, setShowPassword] = useState(false);

  // Hide error when user types
  function handleEmailChange(e) {
    setEmail(e.target.value);
    setLocalError("");
  }
  function handlePasswordChange(e) {
    setPassword(e.target.value);
    setLocalError("");
  }

  // Sync error from parent
  useEffect(() => {
    setLocalError(error);
  }, [error]);

  // Use exact header styles for logo and title
  const headerStyles = {
    display: "flex",
    alignItems: "center",
    height: 56,
    background: "linear-gradient(90deg, #FFD87D 0%, #92D6E3 100%)",
    color: "#3B3B4A",
    paddingLeft: 32,
    paddingRight: 32,
    width: "100%",
    marginBottom: 24,
  };
  const leftStyles = {
    display: "flex",
    alignItems: "center",
  };
  const logoStyles = {
    height: 20,
    width: "auto",
    marginRight: 12,
  };

  // Consistent styles for input and button
  const sharedStyles = {
    padding: "12px 20px",
    fontSize: 16,
    borderRadius: 9999,
    width: 338,
    height: 50,
    boxSizing: "border-box",
    fontFamily: "IBM Plex Sans, Arial, sans-serif",
    fontWeight: 400,
    letterSpacing: "normal",
    lineHeight: "20.0004px",
    marginBottom: 8,
  };
  const inputStyles = {
    ...sharedStyles,
    border: "1px solid #d7d7e0",
    background: "#fff",
    color: "#2B2C3B",
    outline: "none",
  };
  const buttonStyles = {
    ...sharedStyles,
    border: "none",
    background: "#1D2536",
    color: "#fff",
    fontWeight: 500,
    cursor: "pointer",
    marginBottom: 0,
    transition:
      "background 0.18s cubic-bezier(.4,0,.2,1), color 0.18s cubic-bezier(.4,0,.2,1)",
  };

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onLogin(email, password);
        }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ width: "100%", boxSizing: "border-box", paddingLeft: 0 }}>
          <div style={headerStyles}>
            <div style={leftStyles}>
              <img
                src={require("./layout/joii_black.png")}
                alt="JOII Logo"
                style={logoStyles}
                onClick={() =>
                  (window.location.href = "https://joii.org/workstream/")
                }
              />
              <span>Assets & Inventory Management System</span>
            </div>
          </div>
        </div>
        <div
          style={{
            fontSize: 32,
            textAlign: "center",
            marginTop: 200,
            marginBottom: 24,
          }}
        >
          Welcome back
        </div>
        <div style={{ width: 338, marginBottom: 8 }}>
          <input
            id="email"
            type="email"
            value={email}
            onChange={handleEmailChange}
            onFocus={() => setLocalError("")}
            placeholder="Email address"
            style={inputStyles}
          />
        </div>
        <div
          style={{
            width: 338,
            marginBottom: localError || error ? 0 : 8,
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={handlePasswordChange}
            onFocus={() => setLocalError("")}
            placeholder="Password"
            style={{
              ...inputStyles,
              paddingRight: 40,
              height: 50,
              display: "block",
            }}
          />
          <span
            onClick={() => setShowPassword((prev) => !prev)}
            style={{
              position: "absolute",
              right: 16,
              top: 0,
              height: 50,
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              color: showPassword ? "#2B2C3B" : "#888",
              fontSize: 22,
              userSelect: "none",
              width: 24,
              justifyContent: "center",
            }}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {"\u{1F441}"}
          </span>
        </div>
        {(localError || error) && (
          <div
            style={{
              fontFamily: "IBM Plex Sans, Arial, sans-serif",
              fontSize: 14,
              lineHeight: "20.0004px",
              fontWeight: 400,
              letterSpacing: "normal",
              color: "#D32F2F",
              marginBottom: 8,
              width: 338,
              textAlign: "left",
              padding: 0,
            }}
          >
            {localError || error}
          </div>
        )}
        <button
          type="submit"
          style={buttonStyles}
          onMouseEnter={(e) => {
            e.target.style.background = "#E5E5E5";
            e.target.style.color = "#1D2536";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "#1D2536";
            e.target.style.color = "#fff";
          }}
        >
          Continue
        </button>
      </form>
      {/* Remove the footer from the Login component */}
    </div>
  );
}

// --- DebugClaims: For debugging Firebase custom claims ---
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

// --- Main App Component ---
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [redirectToDashboard, setRedirectToDashboard] = useState(false);

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
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Handle login form submission
  const handleLogin = async (email, password) => {
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
  };

  // Handle dashboard redirect after login
  useEffect(() => {
    if (redirectToDashboard) {
      setRedirectToDashboard(false);
    }
  }, [redirectToDashboard]);

  // Loading spinner while checking auth state
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

  // Show login modal if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} error={loginError} />;
  }

  // Redirect to dashboard after login
  if (redirectToDashboard) {
    setRedirectToDashboard(false);
    return <Navigate to="/dashboard" replace />;
  }

  // Main app layout
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
            boxSizing: "border-box",
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
      <DebugClaims />
    </>
  );
}

export default App;
// End of file
