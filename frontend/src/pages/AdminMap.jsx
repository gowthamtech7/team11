import React, { useEffect, useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useNotification } from "../NotificationContext";
import L from "leaflet";

// Fix default icon issue in leaflet with React
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons based on severity/status
const createIcon = (color) => {
    return new L.Icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
};

const icons = {
    High: createIcon('red'),
    Medium: createIcon('orange'),
    Low: createIcon('blue'),
    Resolved: createIcon('green')
};

const API_URL = "http://127.0.0.1:8000";

export default function AdminMap() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const { notify } = useNotification();

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                const response = await axios.get(`${API_URL}/tickets/`);
                // Only keep tickets that have valid latitude and longitude
                const mapTickets = response.data.filter(t => t.latitude != null && t.longitude != null);
                setTickets(mapTickets);
            } catch (err) {
                console.error(err);
                notify("Failed to load map data", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchTickets();
    }, [notify]);

    // Center on India or calculate dynamic center based on data
    const defaultCenter = [20.5937, 78.9629]; // Center of India
    const center = tickets.length > 0 ? [tickets[0].latitude, tickets[0].longitude] : defaultCenter;
    const initialZoom = tickets.length > 0 ? 12 : 5;

    if (loading) return <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading Map Data...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.8rem', color: '#1f2937', margin: 0 }}>Live Damage Map & GPS Tracker</h2>
                <div style={{ background: '#eef2ff', color: '#4f46e5', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold' }}>
                    {tickets.length} Geolocated Tickets
                </div>
            </div>

            <div style={{ background: "white", padding: "20px", borderRadius: "24px", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>

                {/* Map Legend */}
                <div style={{ display: "flex", gap: "20px", marginBottom: "20px", flexWrap: "wrap", background: "#f8fafc", padding: "12px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#475569", display: "flex", alignItems: "center" }}>Legend:</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "14px", color: "#334155" }}><img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png" height="20" alt="" /> Critical/High Priority</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "14px", color: "#334155" }}><img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png" height="20" alt="" /> Medium Priority</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "14px", color: "#334155" }}><img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png" height="20" alt="" /> Low Priority</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "14px", color: "#334155" }}><img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png" height="20" alt="" /> Resolved</div>
                </div>

                <div style={{ height: "65vh", width: "100%", borderRadius: "16px", overflow: "hidden", border: "2px solid #e2e8f0" }}>
                    <MapContainer center={center} zoom={initialZoom} style={{ height: "100%", width: "100%", zIndex: 1 }}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {tickets.map(ticket => {
                            // Determine marker color
                            let markerIcon = icons.Low;
                            if (ticket.status === 'Resolved') {
                                markerIcon = icons.Resolved;
                            } else if (ticket.severity === 'High') {
                                markerIcon = icons.High;
                            } else if (ticket.severity === 'Medium') {
                                markerIcon = icons.Medium;
                            }

                            return (
                                <Marker key={ticket.id} position={[ticket.latitude, ticket.longitude]} icon={markerIcon}>
                                    <Popup>
                                        <div style={{ width: "220px", padding: 0 }}>
                                            <img
                                                src={`${API_URL}${ticket.image_path}`}
                                                alt="Damage"
                                                style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "8px 8px 0 0", margin: "-14px -20px 10px -20px", maxWidth: "calc(100% + 40px)" }}
                                            />
                                            <h4 style={{ margin: "0 0 5px 0", color: "#0f172a" }}>Ticket #{ticket.id}</h4>
                                            <p style={{ margin: "0 0 5px 0", fontSize: "13px", color: "#475569" }}><strong>Type:</strong> {ticket.damage_type.replace('_', ' ')}</p>
                                            <p style={{ margin: "0 0 5px 0", fontSize: "13px", color: "#475569" }}><strong>Severity:</strong> <span style={{ color: ticket.severity === 'High' ? 'red' : ticket.severity === 'Medium' ? 'orange' : 'inherit', fontWeight: 'bold' }}>{ticket.severity}</span></p>
                                            <p style={{ margin: "0 0 10px 0", fontSize: "13px", color: "#475569" }}><strong>Status:</strong> {ticket.status}</p>
                                            <div style={{ fontSize: "12px", color: "#94a3b8", borderTop: "1px solid #e2e8f0", paddingTop: "8px" }}>
                                                Reported by: {ticket.user?.name || "Unknown"}
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                </div>
            </div>
        </div>
    );
}
