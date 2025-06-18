import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./layout/Header";
import Sidebar from "./layout/Sidebar";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Assets from "./pages/Assets";
import Employees from "./pages/Employees";
import Clients from "./pages/Clients";
import UnitSpecs from "./pages/UnitSpecs";
import { db, auth } from "./utils/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

function Login({ onLogin, error, onShowRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onLogin(email, password);
        }}
        style={{
          background: "#fff",
          padding: 40,
          borderRadius: 16,
          boxShadow: "0 8px 32px #0003",
          minWidth: 340,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <h2 style={{ textAlign: "center", color: "#667eea", marginBottom: 8 }}>
          AIMS Login
        </h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #ccc",
            fontSize: 16,
          }}
          autoFocus
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #ccc",
            fontSize: 16,
          }}
        />
        {error && (
          <div style={{ color: "#e53e3e", textAlign: "center" }}>{error}</div>
        )}
        <button
          type="submit"
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
            color: "#fff",
            fontWeight: "bold",
            fontSize: 16,
            border: "none",
            cursor: "pointer",
          }}
        >
          Login
        </button>
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <span style={{ fontSize: 14 }}>Don't have an account? </span>
          <button
            type="button"
            onClick={onShowRegister}
            style={{
              background: "none",
              border: "none",
              color: "#667eea",
              textDecoration: "underline",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Register
          </button>
        </div>
      </form>
    </div>
  );
}

function Register({ onBackToLogin }) {
  const [step, setStep] = useState(1);
  const [adminPass, setAdminPass] = useState("");
  const [adminError, setAdminError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("viewer");
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState(false);

  // Step 1: Admin password check
  if (step === 1) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (adminPass === "JoiiIT@2019!") {
              setStep(2);
              setAdminError("");
            } else {
              setAdminError("Incorrect admin password.");
            }
          }}
          style={{
            background: "#fff",
            padding: 40,
            borderRadius: 16,
            boxShadow: "0 8px 32px #0003",
            minWidth: 340,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <h2
            style={{ textAlign: "center", color: "#667eea", marginBottom: 8 }}
          >
            Admin Verification
          </h2>
          <input
            type="password"
            placeholder="Enter Admin Password"
            value={adminPass}
            onChange={(e) => setAdminPass(e.target.value)}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 8,
              border: "1px solid #ccc",
              fontSize: 16,
            }}
            autoFocus
          />
          {adminError && (
            <div style={{ color: "#e53e3e", textAlign: "center" }}>
              {adminError}
            </div>
          )}
          <button
            type="submit"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 8,
              background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
              color: "#fff",
              fontWeight: "bold",
              fontSize: 16,
              border: "none",
              cursor: "pointer",
            }}
          >
            Continue
          </button>
          <button
            type="button"
            onClick={onBackToLogin}
            style={{
              background: "none",
              border: "none",
              color: "#667eea",
              textDecoration: "underline",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Back to Login
          </button>
        </form>
      </div>
    );
  }

  // Step 2: Register user
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!email || !password) {
            setRegisterError("Email and password are required.");
            return;
          }
          try {
            const cred = await createUserWithEmailAndPassword(
              auth,
              email,
              password
            );
            await setDoc(doc(db, "users", cred.user.uid), { email, role });
            setRegisterSuccess(true);
            setRegisterError("");
          } catch (err) {
            setRegisterError(err.message);
          }
        }}
        style={{
          background: "#fff",
          padding: 40,
          borderRadius: 16,
          boxShadow: "0 8px 32px #0003",
          minWidth: 340,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <h2 style={{ textAlign: "center", color: "#667eea", marginBottom: 8 }}>
          Create Account
        </h2>
        {registerSuccess ? (
          <>
            <div
              style={{
                color: "#38a169",
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              Account created successfully!
            </div>
            <button
              type="button"
              onClick={onBackToLogin}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
                color: "#fff",
                fontWeight: "bold",
                fontSize: 16,
                border: "none",
                cursor: "pointer",
              }}
            >
              Back to Login
            </button>
          </>
        ) : (
          <>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #ccc",
                fontSize: 16,
              }}
              autoFocus
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #ccc",
                fontSize: 16,
              }}
            />
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <label style={{ fontSize: 15, color: "#333" }}>
                <input
                  type="radio"
                  name="role"
                  value="viewer"
                  checked={role === "viewer"}
                  onChange={() => setRole("viewer")}
                  style={{ marginRight: 6 }}
                />
                Viewer
              </label>
              <label style={{ fontSize: 15, color: "#333" }}>
                <input
                  type="radio"
                  name="role"
                  value="editor"
                  checked={role === "editor"}
                  onChange={() => setRole("editor")}
                  style={{ marginRight: 6 }}
                />
                Editor
              </label>
            </div>
            {registerError && (
              <div style={{ color: "#e53e3e", textAlign: "center" }}>
                {registerError}
              </div>
            )}
            <button
              type="submit"
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
                color: "#fff",
                fontWeight: "bold",
                fontSize: 16,
                border: "none",
                cursor: "pointer",
              }}
            >
              Register
            </button>
            <button
              type="button"
              onClick={onBackToLogin}
              style={{
                background: "none",
                border: "none",
                color: "#667eea",
                textDecoration: "underline",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Back to Login
            </button>
          </>
        )}
      </form>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [user, setUser] = useState(null);

  const handleLogin = async (email, password) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", cred.user.uid));
      if (userDoc.exists()) {
        setIsAuthenticated(true);
        setLoginError("");
        setUser({ ...userDoc.data(), uid: cred.user.uid });
      } else {
        setLoginError("No user role found.");
      }
    } catch (err) {
      setLoginError("Invalid email or password.");
    }
  };

  if (!isAuthenticated) {
    if (showRegister) {
      return <Register onBackToLogin={() => setShowRegister(false)} />;
    }
    return (
      <Login
        onLogin={handleLogin}
        error={loginError}
        onShowRegister={() => setShowRegister(true)}
      />
    );
  }

  return (
    <Router>
      <Header user={user} />
      <div style={{ display: "flex" }}>
        <Sidebar />
        <main style={{ flex: 1, padding: 16 }}>
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/inventory" element={<Inventory user={user} />} />
            <Route path="/assets" element={<Assets user={user} />} />
            <Route path="/employees" element={<Employees user={user} />} />
            <Route path="/clients" element={<Clients user={user} />} />
            <Route path="/unit-specs" element={<UnitSpecs user={user} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
