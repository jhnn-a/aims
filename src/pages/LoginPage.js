import { useState, useEffect } from "react";

function LoginPage({ onLogin, error }) {
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

  // Styles for logo and title above the form
  const logoStyles = {
    height: 32,
    width: "auto",
    marginBottom: 12,
    display: "block",
    cursor: "pointer",
  };
  const titleStyles = {
    fontSize: 18,
    fontWeight: 700,
    color: "#233037",
    textAlign: "center",
    marginBottom: 24,
    fontFamily:
      "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    letterSpacing: 0.5,
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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "url('/Joii_Wallpaper_1.png') center center / cover no-repeat",
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onLogin(email, password);
        }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "#fff",
          padding: "36px 40px",
          borderRadius: 18,
          boxShadow: "0 12px 48px rgba(37,99,235,0.08)",
        }}
      >
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={require("../layout/joii_black.png")}
            alt="JOII Logo"
            style={logoStyles}
            onClick={() =>
              (window.location.href = "https://joii.org/workstream/")
            }
          />
          <div style={titleStyles}>Assets & Inventory Management System</div>
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
    </div>
  );
}

export default LoginPage;
