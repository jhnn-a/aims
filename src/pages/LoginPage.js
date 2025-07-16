import { useState, useEffect } from "react";

function LoginPage({ onLogin, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState(error);

  useEffect(() => {
    setLocalError(error);
  }, [error]);

  const styles = {
    container: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background:
        "url('/Joii_Wallpaper_1.png') center center / cover no-repeat",
    },
    form: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      background: "#fff",
      padding: "36px 40px",
      borderRadius: 18,
      boxShadow: "0 12px 48px rgba(37,99,235,0.08)",
      minWidth: 320,
      maxWidth: 360,
    },
    logo: {
      height: 32,
      width: "auto",
      marginBottom: 16,
      display: "block",
      cursor: "pointer",
    },
    title: {
      fontSize: 18,
      fontWeight: 700,
      color: "#233037",
      textAlign: "center",
      marginBottom: 24,
      fontFamily:
        "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      letterSpacing: 0.5,
    },
    input: {
      padding: "12px 20px",
      fontSize: 16,
      borderRadius: 9999,
      width: "100%",
      height: 48,
      boxSizing: "border-box",
      fontFamily: "IBM Plex Sans, Arial, sans-serif",
      fontWeight: 400,
      marginBottom: 10,
      border: "1px solid #d7d7e0",
      background: "#fff",
      color: "#2B2C3B",
      outline: "none",
    },
    passwordWrapper: {
      width: "100%",
      marginBottom: 10,
      position: "relative",
      display: "flex",
      alignItems: "center",
    },
    showPassword: (show) => ({
      position: "absolute",
      right: 16,
      top: 0,
      height: 48,
      display: "flex",
      alignItems: "center",
      cursor: "pointer",
      color: show ? "#2B2C3B" : "#888",
      fontSize: 22,
      userSelect: "none",
      width: 24,
      justifyContent: "center",
    }),
    error: {
      fontFamily: "IBM Plex Sans, Arial, sans-serif",
      fontSize: 14,
      fontWeight: 400,
      color: "#D32F2F",
      marginBottom: 10,
      width: "100%",
      textAlign: "left",
      padding: 0,
    },
    button: {
      padding: "12px 20px",
      fontSize: 16,
      borderRadius: 9999,
      width: "100%",
      height: 48,
      fontFamily: "IBM Plex Sans, Arial, sans-serif",
      fontWeight: 500,
      border: "none",
      background: "#1D2536",
      color: "#fff",
      cursor: "pointer",
      marginBottom: 0,
      transition:
        "background 0.18s cubic-bezier(.4,0,.2,1), color 0.18s cubic-bezier(.4,0,.2,1)",
    },
  };

  function handleEmailChange(e) {
    setEmail(e.target.value);
    setLocalError("");
  }

  function handlePasswordChange(e) {
    setPassword(e.target.value);
    setLocalError("");
  }

  function handleSubmit(e) {
    e.preventDefault();
    onLogin(email, password);
  }

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <img
          src={require("../layout/joii_black.png")}
          alt="JOII Logo"
          style={styles.logo}
          onClick={() =>
            (window.location.href = "https://joii.org/workstream/")
          }
        />
        <div style={styles.title}>Assets & Inventory Management System</div>
        <input
          id="email"
          type="email"
          value={email}
          onChange={handleEmailChange}
          onFocus={() => setLocalError("")}
          placeholder="Email address"
          style={styles.input}
        />
        <div style={styles.passwordWrapper}>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={handlePasswordChange}
            onFocus={() => setLocalError("")}
            placeholder="Password"
            style={{ ...styles.input, paddingRight: 40, marginBottom: 0 }}
          />
          <span
            onClick={() => setShowPassword((prev) => !prev)}
            style={styles.showPassword(showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {"\u{1F441}"}
          </span>
        </div>
        {(localError || error) && (
          <div style={styles.error}>{localError || error}</div>
        )}
        <button
          type="submit"
          style={styles.button}
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
