import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import { NotificationProvider } from "./NotificationContext";
import AuthPage from "./pages/AuthPage";
import UploadPage from "./pages/UploadPage";
import AdminDashboard from "./pages/AdminDashboard";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import MyTickets from "./pages/MyTickets";
import ProfilePage from "./pages/ProfilePage";
import AdminMap from "./pages/AdminMap";

const styles = {
  navbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 60px",
    background: "rgba(15, 23, 42, 0.7)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
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
    alignItems: "center"
  },
  link: {
    textDecoration: "none",
    color: "#94a3b8",
    fontWeight: "600",
    transition: "color 0.2s"
  },
  adminLink: {
    textDecoration: "none",
    color: "#e2e8f0",
    fontWeight: "600",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    padding: "6px 14px",
    borderRadius: "99px",
    transition: "all 0.2s"
  },
  roleBadge: {
    background: "rgba(255,255,255,0.05)",
    color: "#94a3b8",
    border: "1px solid rgba(255,255,255,0.1)",
    padding: "4px 12px",
    borderRadius: "99px",
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },
  adminBadge: {
    background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(236,72,153,0.2))",
    color: "#f8fafc",
    border: "1px solid rgba(236,72,153,0.3)",
    padding: "4px 12px",
    borderRadius: "99px",
    fontSize: "12px",
    fontWeight: "800",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },
  appContainer: {
    minHeight: "100vh",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  }
};

const DefaultNavbar = ({ onLogout, role }) => {
  const isAdmin = role === "admin";
  return (
    <nav className="navbar-container">
      <h2 style={{
        margin: 0,
        fontSize: "1.4rem",
        fontWeight: "800",
        background: "linear-gradient(to right, #818cf8, #e879f9)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        letterSpacing: "-0.04em"
      }}>
        {isAdmin ? "Admin Portal" : "Road Damage"}
      </h2>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {!isAdmin && (
          <>
            <Link to="/" className="nav-link">Report</Link>
            <Link to="/my-tickets" className="nav-link">Tickets</Link>
            <Link to="/profile" className="nav-link">Profile</Link>
          </>
        )}
        {isAdmin && (
          <>
            <Link to="/admin" className="nav-link admin">Dashboard</Link>
            <Link to="/map" className="nav-link admin">Live Map</Link>
            <Link to="/analytics" className="nav-link admin">Analytics</Link>
          </>
        )}
        <div style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.1)", margin: "0 10px" }}></div>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </div>
    </nav>
  );
};

function App() {
  const [user, setUser] = useState(() => {
    const savedToken = localStorage.getItem("token");
    const savedRole = localStorage.getItem("role") || "user";
    const savedName = localStorage.getItem("name") || "";
    return savedToken ? { access_token: savedToken, role: savedRole, name: savedName } : null;
  });

  const handleAuth = (token, role = "user", name = "") => {
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    localStorage.setItem("name", name);
    setUser({ access_token: token, role, name });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    setUser(null);
    window.location.href = "/"; // Reset URL to prevent stuck routing
  };

  return (
    <NotificationProvider>
      <Router>
        <div style={styles.appContainer}>
          {!user ? (
            <AuthPage onAuth={handleAuth} />
          ) : (
            <>
              <DefaultNavbar onLogout={handleLogout} role={user.role} name={user.name} />
              <div style={{ padding: "100px 40px 40px" }}>
                <Routes>
                  {/* User Routes */}
                  <Route path="/" element={
                    user.role === "admin" ? <Navigate to="/admin" replace /> : <UploadPage user={user} />
                  } />
                  <Route path="/my-tickets" element={<MyTickets user={user} />} />
                  <Route path="/profile" element={<ProfilePage user={user} />} />

                  {/* Admin-Only Routes */}
                  {user.role === "admin" && (
                    <>
                      <Route path="/admin" element={<AdminDashboard />} />
                      <Route path="/map" element={<AdminMap />} />
                      <Route path="/analytics" element={<AnalyticsDashboard />} />
                    </>
                  )}

                  {/* Emergency Reset Route */}
                  <Route path="/reset" element={
                    <div style={{ textAlign: "center", padding: "80px", color: "white" }}>
                      <h2>System Reset</h2>
                      <p>Click below to clear all saved data and fix loading issues.</p>
                      <button
                        onClick={() => { localStorage.clear(); window.location.href = "/"; }}
                        style={{ padding: "10px 20px", background: "#ef4444", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", marginTop: "20px" }}
                      >
                        Force Reset & Reload
                      </button>
                    </div>
                  } />

                  {/* Fallback for unauthorized access */}
                  <Route path="*" element={
                    <div className="glass-panel" style={{ textAlign: "center", padding: "80px", color: "#ef4444", marginTop: "40px" }}>
                      <h2>🚫 Access Denied or Page Not Found</h2>
                      <p style={{ color: "#94a3b8" }}>You do not have permission to view this page, or the URL is incorrect.</p>
                      <Link to="/" className="btn btn-primary" style={{ marginTop: "20px", textDecoration: "none", display: "inline-block", padding: "10px 20px", background: "#4f46e5", color: "white", borderRadius: "8px" }}>
                        Return to Home
                      </Link>
                      <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                        <p style={{ color: "#64748b", fontSize: "14px" }}>Stuck on a blank page?</p>
                        <button
                          onClick={() => { localStorage.clear(); window.location.href = "/"; }}
                          style={{ padding: "8px 16px", background: "transparent", color: "#94a3b8", border: "1px solid #64748b", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
                        >
                          Clear Saved Data & Reload
                        </button>
                      </div>
                    </div>
                  } />
                </Routes>
              </div>
            </>
          )}
        </div>
      </Router>
    </NotificationProvider>
  );
}

export default App;