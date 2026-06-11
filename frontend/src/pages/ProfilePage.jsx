import React, { useState, useEffect } from "react";
import axios from "axios";
import { User, Mail, Phone, Save, Edit3 } from "lucide-react";
import { useNotification } from "../NotificationContext";

const API_URL = "http://127.0.0.1:8000";

export default function ProfilePage({ user }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: "", phone: "" });
    const { notify } = useNotification();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await axios.get(`${API_URL}/me`, {
                    headers: { Authorization: `Bearer ${user.access_token}` },
                });
                setProfile(response.data);
                setEditForm({ name: response.data.name, phone: response.data.phone || "" });
            } catch (err) {
                console.error(err);
                notify("Failed to load profile", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [user.access_token, notify]);

    const handleUpdate = async (e) => {
        e.preventDefault();

        // Validate Indian Mobile Number (10 digits) if provided
        if (editForm.phone && !/^\d{10}$/.test(editForm.phone)) {
            notify("Please enter a valid 10-digit mobile number.", "error");
            return;
        }

        try {
            const response = await axios.put(`${API_URL}/me/update`, editForm, {
                headers: { Authorization: `Bearer ${user.access_token}` },
            });
            setProfile(response.data);
            setIsEditing(false);
            notify("Profile updated successfully", "success");
            // Update local storage display name if needed
            if (editForm.name !== localStorage.getItem("name")) {
                localStorage.setItem("name", editForm.name);
                // Require page reload to update navbar or pass up state
            }
        } catch (err) {
            console.error(err);
            notify(err.response?.data?.detail || "Failed to update profile", "error");
        }
    };

    if (loading) return <div style={{ textAlign: "center", padding: "40px" }}>Loading profile...</div>;

    return (
        <div style={{ maxWidth: "600px", margin: "40px auto", animation: "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)" }}>
            <div style={{ background: "rgba(30, 41, 59, 0.7)", backdropFilter: "blur(20px)", borderRadius: "24px", padding: "40px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
                    <div>
                        <h2 style={{ fontSize: "2rem", color: "#f8fafc", margin: "0 0 5px 0", letterSpacing: "-0.02em" }}>My Profile</h2>
                        <p style={{ color: "#94a3b8", margin: 0 }}>Manage your personal details here.</p>
                    </div>
                    <div style={{ width: "80px", height: "80px", background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#818cf8", boxShadow: "0 0 20px rgba(99,102,241,0.2)" }}>
                        <User size={40} />
                    </div>
                </div>

                {isEditing ? (
                    <form onSubmit={handleUpdate}>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Full Name</label>
                            <div style={styles.inputWrapper}>
                                <User size={18} color="#64748b" style={styles.inputIcon} />
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    style={styles.input}
                                    required
                                />
                            </div>
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Email Address (Cannot be changed)</label>
                            <div style={styles.inputWrapper}>
                                <Mail size={18} color="#94a3b8" style={styles.inputIcon} />
                                <input type="email" value={profile?.email} disabled style={{ ...styles.input, background: "#f1f5f9", color: "#94a3b8", cursor: "not-allowed" }} />
                            </div>
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Phone Number</label>
                            <div style={styles.inputWrapper}>
                                <Phone size={18} color="#64748b" style={styles.inputIcon} />
                                <input
                                    type="tel"
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                    style={styles.input}
                                    placeholder="e.g. +91 98765 43210"
                                />
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: "10px", marginTop: "30px" }}>
                            <button type="submit" style={styles.saveBtn}>
                                <Save size={18} /> Save Changes
                            </button>
                            <button type="button" onClick={() => setIsEditing(false)} style={styles.cancelBtn}>
                                Cancel
                            </button>
                        </div>
                    </form>
                ) : (
                    <div>
                        <div style={styles.detailRow}>
                            <div style={styles.iconBox}><User size={20} color="#818cf8" /></div>
                            <div>
                                <div style={styles.label}>Full Name</div>
                                <div style={styles.value}>{profile?.name}</div>
                            </div>
                        </div>

                        <div style={styles.detailRow}>
                            <div style={styles.iconBox}><Mail size={20} color="#818cf8" /></div>
                            <div>
                                <div style={styles.label}>Email Address</div>
                                <div style={styles.value}>{profile?.email}</div>
                            </div>
                        </div>

                        <div style={styles.detailRow}>
                            <div style={styles.iconBox}><Phone size={20} color="#818cf8" /></div>
                            <div>
                                <div style={styles.label}>Phone Number</div>
                                <div style={styles.value}>{profile?.phone || <span style={{ color: "#64748b", fontStyle: "italic" }}>Not provided</span>}</div>
                            </div>
                        </div>

                        <button onClick={() => setIsEditing(true)} style={{ ...styles.saveBtn, marginTop: "20px", display: "flex", alignItems: "center", gap: "8px", justifyContent: "center", width: "100%" }}>
                            <Edit3 size={18} /> Edit Profile
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    inputGroup: {
        marginBottom: "20px"
    },
    label: {
        display: "block",
        fontSize: "14px",
        fontWeight: "600",
        color: "#94a3b8",
        marginBottom: "8px"
    },
    inputWrapper: {
        position: "relative",
        display: "flex",
        alignItems: "center"
    },
    inputIcon: {
        position: "absolute",
        left: "16px"
    },
    input: {
        width: "100%",
        padding: "14px 14px 14px 45px",
        borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.1)",
        fontSize: "15px",
        outline: "none",
        boxSizing: "border-box",
        background: "rgba(15, 23, 42, 0.6)",
        color: "#f8fafc",
        transition: "border-color 0.2s"
    },
    saveBtn: {
        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
        color: "white",
        border: "none",
        padding: "14px 24px",
        borderRadius: "12px",
        fontWeight: "bold",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flex: 1,
        justifyContent: "center",
        boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.4)",
        transition: "transform 0.2s, box-shadow 0.2s"
    },
    cancelBtn: {
        background: "rgba(255,255,255,0.05)",
        color: "#e2e8f0",
        border: "1px solid rgba(255,255,255,0.1)",
        padding: "14px 24px",
        borderRadius: "12px",
        fontWeight: "bold",
        cursor: "pointer",
        flex: 1,
        transition: "background 0.2s"
    },
    detailRow: {
        display: "flex",
        alignItems: "center",
        gap: "16px",
        padding: "16px",
        background: "rgba(15, 23, 42, 0.4)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: "12px",
        marginBottom: "16px"
    },
    iconBox: {
        width: "40px",
        height: "40px",
        background: "rgba(99, 102, 241, 0.1)",
        border: "1px solid rgba(99, 102, 241, 0.2)",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "inset 0 2px 4px rgba(255,255,255,0.05)"
    },
    value: {
        fontSize: "16px",
        fontWeight: "600",
        color: "#f8fafc",
        marginTop: "2px"
    }
};
