import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const API_URL = 'http://127.0.0.1:8000';
const COLORS = ['#818cf8', '#34d399', '#f59e0b', '#fca5a5'];

function AnalyticsDashboard() {
    const [data, setData] = useState(null);
    const [csvUrl, setCsvUrl] = useState(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await axios.get(`${API_URL}/analytics/`);
                setData(response.data);
            } catch (err) {
                console.error(err);
            }
        }
        fetchData();
    }, []);

    const handleExportCSV = () => {
        if (!data) return;
        const rows = [
            ['ID', 'Type', 'Severity', 'Status', 'Date', 'Location'],
            ...(data.tickets || []).map(t => [t.id, t.damage_type, t.severity, t.status, new Date(t.created_at + 'Z').toLocaleString(), t.location])
        ];
        const csvContent = rows.map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv' });
        setCsvUrl(URL.createObjectURL(blob));
    };

    if (!data) return <div>Loading Analytics...</div>;

    const typeData = Object.keys(data.damage_type_distribution).map(key => ({
        name: key, value: data.damage_type_distribution[key]
    }));

    const severityData = Object.keys(data.severity_distribution).map(key => ({
        name: key, value: data.severity_distribution[key]
    }));

    const trendData = (data.trend || [
        { date: '2026-02-25', count: 2 },
        { date: '2026-02-26', count: 4 },
        { date: '2026-02-27', count: 3 },
        { date: '2026-02-28', count: 7 },
        { date: '2026-03-01', count: 5 },
        { date: '2026-03-02', count: 6 },
    ]);

    // Transform ticket locations into coordinate pairs for map
    const mapMarkers = (data.tickets || [])
        .filter(t => t.location && t.location !== 'Unknown')
        .map(t => {
            const [lat, lng] = t.location.split(',').map(coord => parseFloat(coord.trim()));
            return { id: t.id, lat, lng, type: t.damage_type, severity: t.severity };
        })
        .filter(t => !isNaN(t.lat) && !isNaN(t.lng));

    // Default center point for the map
    const defaultCenter = mapMarkers.length > 0 ? [mapMarkers[0].lat, mapMarkers[0].lng] : [20.5937, 78.9629]; // India default

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                <button className="btn" style={{ fontSize: '1rem', padding: '0.5rem 1.5rem', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' }} onClick={handleExportCSV}>
                    Export CSV
                </button>
                {csvUrl && (
                    <a href={csvUrl} download="tickets_analytics.csv" style={{ marginLeft: '1rem', color: '#818cf8', textDecoration: 'underline' }}>Download</a>
                )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '3rem' }}>
                <div className="glass-panel" style={{ textAlign: 'center', padding: '2.5rem 2rem', borderTop: '4px solid var(--primary)' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Total Reports</div>
                    <div className="text-gradient" style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1 }}>{data.total_tickets}</div>
                </div>
                <div className="glass-panel" style={{ textAlign: 'center', padding: '2.5rem 2rem', borderTop: '4px solid #fca5a5' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Open Maintenance</div>
                    <div style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1, color: '#fca5a5' }}>{data.status_distribution['Open'] || 0}</div>
                </div>
                <div className="glass-panel" style={{ textAlign: 'center', padding: '2.5rem 2rem', borderTop: '4px solid #34d399' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Resolved Issues</div>
                    <div style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1, color: '#34d399' }}>{data.status_distribution['Resolved'] || 0}</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '32px', marginBottom: '3rem' }}>
                {/* Trends Line Chart */}
                <div className="glass-panel" style={{ padding: '2.5rem' }}>
                    <h3 style={{ marginBottom: '2rem', color: '#34d399', fontWeight: 800 }}>Reporting Flux</h3>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="date" stroke="var(--text-dim)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis allowDecimals={false} stroke="var(--text-dim)" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: 'var(--shadow-xl)' }} />
                                <Line type="monotone" dataKey="count" stroke="#34d399" strokeWidth={4} dot={{ r: 6, fill: '#34d399', strokeWidth: 2, stroke: '#0b0f1a' }} activeDot={{ r: 8, strokeWidth: 0 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Leaflet Map Integration */}
                <div className="glass-panel" style={{ padding: '2.5rem' }}>
                    <h3 style={{ marginBottom: '2rem', color: '#fca5a5', fontWeight: 800 }}>Hotspot Mapping</h3>
                    <div style={{ height: '300px', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%', zIndex: 1, filter: 'invert(90%) hue-rotate(180deg) brightness(95%) contrast(90%)' }}>
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {mapMarkers.map(marker => (
                                <Marker key={marker.id} position={[marker.lat, marker.lng]}>
                                    <Popup>
                                        <div style={{ filter: 'invert(100%) hue-rotate(180deg)', background: 'transparent' }}>
                                            <strong>Ticket #{marker.id}</strong><br />
                                            Severity: {marker.severity}
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '2.5rem' }}>
                    <h3 style={{ marginBottom: '2rem', fontSize: '1.4rem', color: 'var(--primary)', fontWeight: 800 }}>Damage Typology</h3>
                    <div style={{ height: '320px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={typeData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={110}
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {typeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '2.5rem' }}>
                    <h3 style={{ marginBottom: '2rem', color: 'var(--text-main)', fontWeight: 800 }}>Severity Analysis</h3>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={severityData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text-dim)" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                                <Bar dataKey="value" fill="var(--primary)" radius={[6, 6, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AnalyticsDashboard;
