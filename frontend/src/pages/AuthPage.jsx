import React, { useState } from "react";
import axios from "axios";
import { ShieldCheck, User as UserIcon, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function AuthPage({ onAuth }) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("select"); // "select" or "auth"
  const [selectedRole, setSelectedRole] = useState(null); // "admin" or "user"
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setIsLogin(true); // Always default to login first
    setViewMode("auth");
    setError("");
    setSuccessMsg("");
  };

  const handleBack = () => {
    setViewMode("select");
    setSelectedRole(null);
    setError("");
    setSuccessMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    try {
      if (isLogin) {
        const res = await axios.post(`${API_URL}/login`, {
          email,
          password,
        });

        // Ensure that someone logging into the admin portal actually has the admin role
        if (selectedRole === "admin" && res.data.role !== "admin") {
          setError("Access Denied: This account does not have administrator privileges.");
          return;
        }

        // Enforce that citizens can only access the reporting portal
        if (selectedRole === "user" && res.data.role === "admin") {
          setError("Admins should use the Administrator Portal to sign in.");
          return;
        }

        onAuth(res.data.access_token, res.data.role || "user", res.data.name || "");

        // Explicitly navigate based on role
        if (res.data.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/");
        }
      } else {
        // Validate Indian Mobile Number (10 digits) if provided
        if (phone && !/^\d{10}$/.test(phone)) {
          setError("Please enter a valid 10-digit mobile number.");
          return;
        }

        const res = await axios.post(`${API_URL}/register`, {
          name,
          email,
          phone,
          password,
        });
        setSuccessMsg("Registration successful! Please sign in.");
        setIsLogin(true);
        setPassword(""); // clear password for login
        setPhone(""); // clear phone for login
      }
    } catch (err) {
      setError(err.response?.data?.detail || (isLogin ? "Login failed" : "Registration failed"));
    }
  };

  return (
    <div style={styles.page}>
      <nav style={styles.navbar}>
        <h2 style={styles.logo}>Road Damage Detection</h2>

      </nav>

      {viewMode === "select" ? (
        <div style={styles.selectionContainer}>
          <div style={styles.header}>
            <h1 style={styles.title}>Welcome to the Portal</h1>
            <p style={styles.subtitle}>Please select your account type to continue</p>
          </div>

          <div style={styles.roleGrid}>
            <div style={styles.roleCard} onClick={() => handleRoleSelect("user")}>
              <div style={styles.iconCircleUser}>
                <UserIcon size={40} color="#4f46e5" />
              </div>
              <h3 style={styles.roleTitle}>Citizen / User</h3>
              <p style={styles.roleDesc}>Report road damages and track your submitted tickets.</p>
            </div>

            <div style={styles.roleCard} onClick={() => handleRoleSelect("admin")}>
              <div style={styles.iconCircleAdmin}>
                <ShieldCheck size={40} color="#ec4899" />
              </div>
              <h3 style={styles.roleTitle}>Administrator</h3>
              <p style={styles.roleDesc}>Manage reported damages, view analytics, and resolve tickets.</p>
            </div>
          </div>
        </div>
      ) : (
        <div style={styles.card}>
          <button style={styles.backButton} onClick={handleBack}>
            <ArrowLeft size={20} /> Back
          </button>

          <div style={{ marginBottom: "40px" }}>
            <h2 className="text-gradient" style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0 }}>
              {selectedRole === "admin" ? "Admin Portal" : "Citizen Center"}
            </h2>
            <p style={{ color: "var(--text-muted)", margin: "10px 0 0 0", fontSize: "1.1rem" }}>
              {isLogin ? "Welcome back! Please authenticate." : "Join the effort to improve our roads."}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <input
                  type="text"
                  placeholder="Full Name (Required)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={styles.input}
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone Number (Optional)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={styles.input}
                />
              </>
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />

            {error && <p style={styles.error}>{error}</p>}
            {successMsg && <p style={styles.success}>{successMsg}</p>}

            <button type="submit" className="btn btn-primary shadow-glow" style={{ width: '100%', padding: '18px', fontSize: '1.1rem' }}>
              {isLogin ? "Verify Identity" : "Create Account"}
            </button>
          </form>

          {/* Only allow registration for regular users to maintain security */}
          {selectedRole === "user" && (
            <p style={styles.registerText}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span
                style={{ color: "#4f46e5", cursor: "pointer", fontWeight: "bold" }}
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                  setSuccessMsg("");
                }}
              >
                {isLogin ? "Register here" : "Sign in here"}
              </span>
            </p>
          )}

          {selectedRole === "admin" && (
            <p style={{ marginTop: "20px", fontSize: "13px", color: "#94a3b8" }}>
              Admin accounts are provided by the system administrator.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column"
  },
  navbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 60px",
    background: "rgba(15, 23, 42, 0.7)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderBottom: "1px solid rgba(255,255,255,0.08)"
  },
  logo: {
    color: "#f8fafc",
    fontWeight: "800",
    margin: 0,
    background: "linear-gradient(to right, #818cf8, #e879f9)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "-0.04em"
  },
  navLinks: {
    display: "flex",
    gap: "30px",
    color: "#94a3b8",
    fontWeight: "600",
  },
  selectionContainer: {
    maxWidth: "800px",
    margin: "80px auto",
    padding: "20px",
    animation: "fadeIn 0.5s ease-out",
  },
  header: {
    textAlign: "center",
    marginBottom: "50px",
  },
  title: {
    fontSize: "36px",
    fontWeight: "800",
    color: "#f8fafc",
    marginBottom: "10px",
    background: "linear-gradient(135deg, #c084fc, #818cf8)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    fontSize: "18px",
    color: "#94a3b8",
  },
  roleGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "30px",
  },
  roleCard: {
    background: "rgba(30, 41, 59, 0.7)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "24px",
    padding: "40px 30px",
    textAlign: "center",
    cursor: "pointer",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
    transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease, border-color 0.4s",
  },
  iconCircleUser: {
    width: "80px",
    height: "80px",
    background: "rgba(99,102,241,0.1)",
    border: "1px solid rgba(99,102,241,0.3)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px auto",
    boxShadow: "0 0 20px rgba(99,102,241,0.2)"
  },
  iconCircleAdmin: {
    width: "80px",
    height: "80px",
    background: "rgba(236,72,153,0.1)",
    border: "1px solid rgba(236,72,153,0.3)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px auto",
    boxShadow: "0 0 20px rgba(236,72,153,0.2)"
  },
  roleTitle: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#f8fafc",
    margin: "0 0 10px 0",
  },
  roleDesc: {
    color: "#94a3b8",
    fontSize: "15px",
    lineHeight: "1.6",
    margin: 0,
  },
  card: {
    maxWidth: "450px",
    margin: "80px auto",
    padding: "40px",
    background: "rgba(30, 41, 59, 0.7)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "24px",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
    textAlign: "center",
    position: "relative",
    animation: "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
  },
  backButton: {
    position: "absolute",
    top: "20px",
    left: "20px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "99px",
    padding: "6px 14px",
    color: "#e2e8f0",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    transition: "background 0.2s",
  },
  input: {
    width: "100%",
    padding: "16px",
    marginBottom: "20px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.1)",
    fontSize: "16px",
    background: "rgba(15, 23, 42, 0.6)",
    color: "#f8fafc",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  },
  button: {
    width: "100%",
    padding: "16px",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    border: "none",
    borderRadius: "12px",
    color: "white",
    fontSize: "18px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.4)",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  registerText: {
    marginTop: "24px",
    color: "#94a3b8",
    fontSize: "15px",
  },
  error: {
    color: "#ef4444",
    marginBottom: "15px",
    fontSize: "14px",
    fontWeight: "600",
    padding: "10px",
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    borderRadius: "8px"
  },
  success: {
    color: "#10b981",
    marginBottom: "15px",
    fontSize: "14px",
    fontWeight: "600",
    padding: "10px",
    background: "rgba(16, 185, 129, 0.1)",
    border: "1px solid rgba(16, 185, 129, 0.2)",
    borderRadius: "8px"
  },
};