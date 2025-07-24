import { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import "./LoginPage.css";

function LoginPage({ onLogin, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState(error);

  useEffect(() => {
    setLocalError(error);
  }, [error]);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setLocalError("");
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    setLocalError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    try {
      const db = getFirestore();
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();
        console.log("Fetched user data:", userData); // Debug log
        if (userData.password === password) {
          onLogin(userData, userDoc.id);
        } else {
          setLocalError("Invalid email or password.");
        }
      } else {
        setLocalError("Invalid email or password.");
      }
    } catch (err) {
      setLocalError("Login error: " + err.message);
      console.error("Firestore login error:", err);
    }
  };

  return (
    <div
      className="login-container"
      style={{
        minHeight: "100vh",
        background:
          "#233037 url('/Joii_Background.png') center center/cover no-repeat",
      }}
    >
      <form onSubmit={handleSubmit} className="login-form">
        <img
          src={require("../layout/joii_black.png")}
          alt="JOII Logo"
          className="login-logo"
          onClick={() =>
            (window.location.href = "https://joii.org/workstream/")
          }
        />
        <div className="login-title">Assets & Inventory Management System</div>
        <input
          id="email"
          type="email"
          value={email}
          onChange={handleEmailChange}
          onFocus={() => setLocalError("")}
          placeholder="Email address"
          className="login-input"
        />
        <div className="login-password-wrapper">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={handlePasswordChange}
            onFocus={() => setLocalError("")}
            placeholder="Password"
            className="login-input"
            style={{ paddingRight: 40, marginBottom: 0 }}
          />
          <span
            onClick={() => setShowPassword((prev) => !prev)}
            className={`login-show-password${showPassword ? " active" : ""}`}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {"\u{1F441}"}
          </span>
        </div>
        {(localError || error) && (
          <div className="login-error">{localError || error}</div>
        )}
        <button type="submit" className="login-button">
          Continue
        </button>
      </form>
    </div>
  );
}

export default LoginPage;
