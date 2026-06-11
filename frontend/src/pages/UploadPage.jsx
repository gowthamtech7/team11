import React, { useState, useRef, useEffect } from "react";
import { UploadCloud, CheckCircle, AlertCircle, Loader2, MapPin, Camera, X, Image as ImageIcon, Search, Navigation } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
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

const API_URL = "http://127.0.0.1:8000";

// --- Helper Component to handle Map Clicks ---
function MapEventHandler({ setMapPin }) {
  useMapEvents({
    click(e) {
      setMapPin({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// --- Helper Component to Recenter Map ---
function ChangeView({ center, zoom }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

function UploadPage({ onLogout }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Flow State
  const [mode, setMode] = useState("select"); // "select", "upload", "camera"

  // Location State
  const [location, setLocation] = useState("Unknown"); // The final location string
  const [isLocating, setIsLocating] = useState(false);
  const [locationMode, setLocationMode] = useState("auto"); // "auto", "manual", "refining", "selected"

  // Autocomplete State
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  // Map State for Refinement
  const [mapPin, setMapPin] = useState(null);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // Default India
  const [mapZoom, setMapZoom] = useState(5);

  // Other State
  const [stream, setStream] = useState(null);
  const [comment, setComment] = useState("");

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const fetchLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(`${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
        setLocationMode("selected");
        setIsLocating(false);
      },
      () => {
        setError("Location permission denied. Please enter manually.");
        setLocation("Unknown");
        setLocationMode("manual");
        setIsLocating(false);
      }
    );
  };

  const startCamera = async () => {
    setMode("camera");
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      setError("Please allow camera access in your browser settings.");
      setMode("select");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageUrl = canvas.toDataURL("image/jpeg");
      setPreview(imageUrl);

      canvas.toBlob((blob) => {
        const file = new File([blob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" });
        setSelectedFile(file);
      }, "image/jpeg", 0.95);

      stopCamera();
      setMode("upload");

      // Auto-fetch location if they took a camera shot
      fetchLocation();
    }
  };

  const handleFileChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file) => {
    setError(null);
    setResult(null);
    if (!file.type.match("image.*")) {
      setError("Please select a valid image file (JPG, PNG, WEBP).");
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
      setMode("upload");
      setLocation("Unknown");
      setLocationMode("auto"); // Reset so they can choose after analysis
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Session expired. Please login again.");
      return;
    }
    if (!selectedFile) {
      setError("Please select an image first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setTicket(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch(`${API_URL}/upload/`, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/";
          throw new Error("Session expired. Please log in again.");
        }
        throw new Error(data.detail || "Failed to analyze image");
      }

      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Server error occurred during analysis.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchLocation = async (query) => {
    setSearchQuery(query);
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }
    setIsSearchingLocation(true);
    try {
      // Free Nominatim API - focused on India (countrycodes=in)
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5`);
      const data = await res.json();
      setSuggestions(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const selectSuggestion = (suggestion) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);

    // Jump to the map view for precise pinning
    setMapCenter([lat, lng]);
    setMapZoom(16);
    setMapPin({ lat, lng });
    setSuggestions([]);

    const addressParts = suggestion.display_name.split(", ");
    const shortAddress = addressParts.length > 3 ? addressParts.slice(0, 3).join(", ") : suggestion.display_name;
    setSearchQuery(shortAddress);

    setLocationMode("refining");
  };

  const confirmMapPin = async () => {
    if (!mapPin) return;

    setIsSearchingLocation(true);
    try {
      // Reverse Geocoding to get address of the exact pinned spot
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${mapPin.lat}&lon=${mapPin.lng}`);
      const data = await res.json();

      let friendlyName = searchQuery; // Fallback to search term
      if (data && data.display_name) {
        const addressParts = data.display_name.split(", ");
        friendlyName = addressParts.length > 3 ? addressParts.slice(0, 3).join(", ") : data.display_name;
      }

      const finalLocationString = `${mapPin.lat.toFixed(6)}, ${mapPin.lng.toFixed(6)} | ${friendlyName}`;
      setLocation(finalLocationString);
      setLocationMode("selected");
    } catch (err) {
      // Fallback if geocoding fails
      const finalLocationString = `${mapPin.lat.toFixed(6)}, ${mapPin.lng.toFixed(6)} | Near ${searchQuery}`;
      setLocation(finalLocationString);
      setLocationMode("selected");
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const cancelRefinement = () => {
    setLocationMode("manual");
    setMapPin(null);
    setSearchQuery("");
  };

  const handleSubmitTicket = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Session expired. Please login again.");
      return;
    }

    if (location === "Unknown" || locationMode !== "selected") {
      setError("Please confirm the location before submitting.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    let lat = null;
    let lng = null;
    let locationText = location;

    // Parse out Lat/Lng if it's there
    if (location.includes("|")) {
      const [coords, name] = location.split(" | ");
      const [parsedLat, parsedLng] = coords.split(", ").map(Number);
      lat = parsedLat;
      lng = parsedLng;
      locationText = name; // Just save the friendly name as the location string
    } else if (location.includes(",") && !location.match(/[a-zA-Z]/)) {
      // It's just raw GPS coords (from fetchLocation)
      const parts = location.split(", ");
      if (parts.length === 2 && !isNaN(parts[0])) {
        lat = parseFloat(parts[0]);
        lng = parseFloat(parts[1]);
      }
    }

    const payload = {
      image_path: result.image_path,
      damage_type: result.prediction.class || "Unknown",
      severity: result.prediction.severity || "Unknown",
      confidence: result.prediction.confidence || 0.0,
      location: locationText,
      latitude: lat,
      longitude: lng,
      user_comment: comment
    };

    try {
      const response = await fetch(`${API_URL}/tickets/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to submit ticket");
      }

      setTicket(data);
      setResult(null);
      setPreview(null);
      setMode("select");
      setSelectedFile(null);
      setComment("");
      setLocationMode("auto");
      setLocation("Unknown");
      setMapPin(null);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to submit ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setTicket(null);
    setError(null);
    setMode("select");
    setLocationMode("auto");
    setLocation("Unknown");
    setSuggestions([]);
    setSearchQuery("");
    setMapPin(null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 className="text-gradient" style={{ fontSize: '3.5rem', fontWeight: 800, margin: 0 }}>Smart Reporting</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px', margin: '15px auto 0' }}>Deploy AI to analyze and log road infrastructure issues in seconds.</p>
      </div>

      <div style={styles.contentWrapper}>
        <div style={styles.uploadCard}>

          {/* Main Selection Area */}
          {mode === "select" && (
            <div style={styles.modeSelectionGrid}>
              <div
                className="glass-panel hover-glow"
                style={{ padding: '60px 40px', textAlign: 'center', cursor: 'pointer', transition: 'var(--transition)' }}
                onClick={() => fileInputRef.current.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                <div style={{ ...styles.iconCircle, margin: '0 auto 20px' }}><ImageIcon size={32} color="var(--primary)" /></div>
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.25rem' }}>Local Upload</h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '8px' }}>Select from device gallery</p>
              </div>

              <div
                className="glass-panel hover-glow"
                style={{ padding: '60px 40px', textAlign: 'center', cursor: 'pointer', transition: 'var(--transition)' }}
                onClick={startCamera}
              >
                <div style={{ ...styles.iconCircle, margin: '0 auto 20px', background: 'rgba(236, 72, 153, 0.1)', borderColor: 'rgba(236, 72, 153, 0.3)' }}><Camera size={32} color="var(--secondary)" /></div>
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.25rem' }}>Live Capture</h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '8px' }}>Use device camera</p>
              </div>
            </div>
          )}

          {/* Camera Feed Area */}
          {mode === "camera" && (
            <div style={styles.cameraContainer}>
              <video ref={videoRef} autoPlay playsInline style={styles.videoFeed}></video>
              <div style={styles.cameraControls}>
                <button onClick={() => { stopCamera(); setMode("select"); }} style={styles.cancelButton}><X size={24} /></button>
                <button onClick={captureImage} style={styles.captureBtn}>
                  <div style={styles.captureBtnInner}></div>
                </button>
                <div style={{ width: 44 }}></div> {/* Spacer for symmetry */}
              </div>
              <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
            </div>
          )}

          {/* Preview & Upload Area */}
          {mode === "upload" && preview && (
            <div style={styles.previewContainer}>
              <div style={{ position: 'relative', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                <img src={preview} alt="Preview" style={{ width: '100%', display: 'block' }} />
                
                <button
                  onClick={clearSelection}
                  style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', border: 'none', color: 'white', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
                {loading && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="ai-spinner shadow-glow"></div>
                    <div style={{ position: 'absolute', width: '100%', height: '2px', background: 'var(--primary)', boxShadow: '0 0 20px var(--primary)', top: '0', animation: 'scan 2s linear infinite' }}></div>
                  </div>
                )}
              </div>

              {!result && (
                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="btn btn-primary shadow-glow"
                  style={{ width: '100%', marginTop: '24px' }}
                >
                  {loading ? (
                    <><Loader2 size={20} className="spin" style={{ marginRight: '10px' }} /> Performing AI Diagnostics...</>
                  ) : (
                    <>Analyze Pavement Damage</>
                  )}
                </button>
              )}
            </div>
          )}

          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Results Section */}
        {result && (
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
              <div style={{ background: 'rgba(52, 211, 153, 0.1)', padding: '8px', borderRadius: '12px' }}>
                <CheckCircle color="#34d399" size={28} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>Analysis Verdict</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
              <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Classification</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{result.prediction.class || 'Unknown'}</p>
              </div>
              <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Maintenance Priority</p>
                <p style={{
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  margin: 0,
                  color: result.prediction.severity === 'High' ? '#fca5a5' : result.prediction.severity === 'Medium' ? '#fde047' : '#86efac'
                }}>
                  {result.prediction.severity || 'N/A'}
                </p>
              </div>
            </div>

            {/* Confidence Bar */}
            <div style={{ marginBottom: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '10px' }}>
                <span>AI Confidence Score</span>
                <span style={{ color: 'var(--primary)' }}>{result.prediction.confidence ? (result.prediction.confidence * 100).toFixed(1) + '%' : 'N/A'}</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '99px',
                  width: result.prediction.confidence ? `${(result.prediction.confidence * 100).toFixed(0)}%` : '0%',
                  background: 'linear-gradient(90deg, var(--primary), #818cf8)',
                  transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)'
                }}></div>
              </div>
            </div>

            {/* Location Selection Block */}
            <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', padding: '20px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={18} color="#818cf8" /> Where was this photo taken?
              </h3>

              {locationMode === "selected" ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '12px 16px', borderRadius: '12px' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '12px', color: '#10b981', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Location Confirmed</span>
                    <span style={{ fontSize: '15px', color: '#f8fafc' }}>{location.includes("|") ? location.split(" | ")[1] : location}</span>
                  </div>
                  <button onClick={() => { setLocationMode("auto"); setLocation("Unknown"); setMapPin(null); }} style={{ background: 'transparent', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}>Change</button>
                </div>
              ) : locationMode === "refining" ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Tap or click anywhere on the map to pin the exact damage location.</p>

                  <div style={styles.mapContainerStyle}>
                    <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: "100%", width: "100%", zIndex: 1, borderRadius: "12px" }}>
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <ChangeView center={mapCenter} zoom={mapZoom} />
                      <MapEventHandler setMapPin={setMapPin} />
                      {mapPin && (
                        <Marker position={[mapPin.lat, mapPin.lng]} icon={DefaultIcon} />
                      )}
                    </MapContainer>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={cancelRefinement} style={{ flex: 1, padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#f8fafc', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
                      Cancel
                    </button>
                    <button
                      onClick={confirmMapPin}
                      disabled={!mapPin || isSearchingLocation}
                      style={{ flex: 2, padding: '12px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                    >
                      {isSearchingLocation ? <Loader2 size={16} className="spin" /> : <CheckCircle size={16} color="white" />}
                      Confirm Pin
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button onClick={fetchLocation} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.2s', fontSize: '15px' }}>
                    {isLocating ? <Loader2 size={18} className="spin" /> : <Navigation size={18} />}
                    {isLocating ? 'Detecting GPS...' : '📍 Use Current Location (Auto)'}
                  </button>

                  <div style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>OR</div>

                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '0 12px' }}>
                      <Search size={18} color="#94a3b8" />
                      <input
                        type="text"
                        placeholder="Search manual location (e.g. Bandra, Mumbai)"
                        value={searchQuery}
                        onChange={(e) => handleSearchLocation(e.target.value)}
                        style={{ flex: 1, background: 'transparent', border: 'none', color: '#f8fafc', padding: '14px 12px', fontSize: '15px', outline: 'none' }}
                      />
                      {isSearchingLocation && <Loader2 size={16} color="#818cf8" className="spin" />}
                    </div>

                    {/* Autocomplete Dropdown */}
                    {suggestions.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', marginTop: '4px', zIndex: 10, overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                        {suggestions.map((s, idx) => (
                          <div
                            key={idx}
                            onClick={() => selectSuggestion(s)}
                            style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', fontSize: '14px', color: '#e2e8f0', transition: 'background 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ fontWeight: '500', color: '#f8fafc' }}>{s.display_name.split(", ")[0]}</div>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{s.display_name}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Comment Section */}
            <div style={{ width: '100%', marginBottom: '1.5rem', textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem', marginLeft: '0.2rem' }}>
                Additional Comments
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="E.g., Deep pothole near the main intersection, please check ASAP."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                  minHeight: '80px',
                  resize: 'vertical',
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  color: '#f8fafc',
                  transition: 'border-color 0.2s',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#818cf8'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            <button
              onClick={handleSubmitTicket}
              disabled={isSubmitting || locationMode !== "selected"}
              style={{ ...styles.analyzeButton, ...((isSubmitting || locationMode !== "selected") ? styles.buttonDisabled : {}) }}
            >
              {isSubmitting ? (
                <><Loader2 size={20} className="spin" style={styles.spinIcon} /> Submitting...</>
              ) : (
                <>Confirm & Submit Complaint</>
              )}
            </button>
          </div>
        )}

        {/* Success Banner after submission */}
        {ticket && !result && (
          <div style={{ ...styles.resultCard, display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", textAlign: "center" }}>
            <CheckCircle color="#34d399" size={56} style={{ marginBottom: "10px" }} />
            <h2 style={{ ...styles.resultTitle, fontSize: "32px" }}>Complaint Submitted!</h2>
            <p style={{ color: "#94a3b8", fontSize: "16px", marginBottom: "20px" }}>Thank you for keeping our roads safe. The authorities have been notified.</p>

            <div style={styles.ticketBanner}>
              <MapPin size={24} color="#818cf8" />
              <div>
                <p style={{ margin: 0, fontSize: "16px", color: "#f8fafc", fontWeight: "700" }}>Ticket #{ticket.id} Generated</p>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#94a3b8" }}>You can track its status in "My Tickets".</p>
              </div>
            </div>

            <button onClick={clearSelection} style={{ ...styles.analyzeButton, marginTop: "20px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", boxShadow: "none" }}>
              Submit Another Report
            </button>
          </div>
        )}
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div >
  );
}

const styles = {
  container: {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "20px",
    animation: "fadeIn 0.6s ease-out",
  },
  header: {
    textAlign: "center",
    marginBottom: "40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  title: {
    fontSize: "42px",
    fontWeight: "800",
    color: "#f8fafc",
    marginBottom: "12px",
    background: "linear-gradient(135deg, #c084fc, #818cf8)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    fontSize: "16px",
    color: "#94a3b8",
    maxWidth: "600px",
    lineHeight: "1.6",
    marginBottom: "16px",
  },
  locationBadge: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(10px)",
    color: "#e2e8f0",
    padding: "8px 16px",
    borderRadius: "20px",
    fontSize: "14px",
    fontWeight: "600",
    border: "1px solid rgba(255,255,255,0.1)"
  },
  contentWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "30px",
  },
  uploadCard: {
    width: "100%",
    maxWidth: "600px",
    background: "rgba(30, 41, 59, 0.7)",
    backdropFilter: "blur(20px)",
    borderRadius: "24px",
    padding: "30px",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  modeSelectionGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
  },
  optionBox: {
    border: "2px dashed rgba(255,255,255,0.2)",
    borderRadius: "20px",
    padding: "40px 20px",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    background: "rgba(255,255,255,0.02)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: "70px",
    height: "70px",
    background: "rgba(99,102,241,0.1)",
    border: "1px solid rgba(99,102,241,0.3)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "16px",
    boxShadow: "0 0 20px rgba(99,102,241,0.2)",
  },
  optionTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#f8fafc",
    margin: "0 0 8px 0",
  },
  optionDesc: {
    fontSize: "13px",
    color: "#94a3b8",
    margin: 0,
  },
  cameraContainer: {
    position: "relative",
    width: "100%",
    borderRadius: "16px",
    overflow: "hidden",
    background: "#000",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
  },
  videoFeed: {
    width: "100%",
    height: "auto",
    maxHeight: "450px",
    objectFit: "cover",
  },
  cameraControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
  },
  cancelButton: {
    background: "rgba(255,255,255,0.2)",
    color: "white",
    border: "none",
    borderRadius: "50%",
    width: "44px",
    height: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    backdropFilter: "blur(4px)",
  },
  captureBtn: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    cursor: "pointer",
  },
  captureBtnInner: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    background: "white",
  },
  previewContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  imageWrapper: {
    position: "relative",
    width: "100%",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
    border: "1px solid rgba(255,255,255,0.1)",
  },
  previewImage: {
    width: "100%",
    height: "auto",
    maxHeight: "450px",
    objectFit: "contain",
    display: "block",
    background: "rgba(15, 23, 42, 0.8)",
  },
  clearButton: {
    position: "absolute",
    top: "15px",
    right: "15px",
    background: "rgba(15, 23, 42, 0.8)",
    color: "white",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "50%",
    width: "36px",
    height: "36px",
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(8px)",
    transition: "background 0.2s",
  },
  analyzeButton: {
    width: "100%",
    padding: "18px",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "white",
    border: "none",
    borderRadius: "14px",
    fontSize: "18px",
    fontWeight: "700",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.4)",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  buttonDisabled: {
    opacity: 0.6,
    pointerEvents: "none",
    background: "rgba(255,255,255,0.1)",
    boxShadow: "none",
    border: "1px solid rgba(255,255,255,0.1)",
  },
  spinIcon: {
    marginRight: "8px",
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "rgba(239, 68, 68, 0.1)",
    color: "#fca5a5",
    padding: "16px",
    borderRadius: "12px",
    marginTop: "20px",
    fontSize: "15px",
    fontWeight: "600",
    border: "1px solid rgba(239, 68, 68, 0.2)",
  },
  resultCard: {
    width: "100%",
    maxWidth: "600px",
    background: "rgba(30, 41, 59, 0.8)",
    backdropFilter: "blur(20px)",
    borderRadius: "24px",
    padding: "30px",
    boxShadow: "0 25px 50px -12px rgba(16, 185, 129, 0.15)",
    border: "1px solid rgba(16, 185, 129, 0.3)",
    animation: "slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
  },
  resultHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "24px",
  },
  resultTitle: {
    fontSize: "26px",
    fontWeight: "800",
    color: "#34d399",
    margin: 0,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "15px",
    marginBottom: "24px",
  },
  statBox: {
    background: "rgba(15, 23, 42, 0.6)",
    padding: "20px 10px",
    borderRadius: "16px",
    textAlign: "center",
    border: "1px solid rgba(255,255,255,0.05)",
    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)",
  },
  statLabel: {
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "1px",
    color: "#94a3b8",
    margin: "0 0 8px 0",
    fontWeight: "700",
  },
  statValue: {
    fontSize: "22px",
    fontWeight: "900",
    color: "#f8fafc",
    margin: 0,
  },
  ticketBanner: {
    background: "rgba(99, 102, 241, 0.1)",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    border: "1px solid rgba(99, 102, 241, 0.3)",
  },
  searchInput: {
    flex: 1,
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(15, 23, 42, 0.6)",
    color: "white",
    fontSize: "15px",
    outline: "none",
  },
  searchButton: {
    padding: "0 20px",
    background: "rgba(99, 102, 241, 0.8)",
    border: "none",
    borderRadius: "12px",
    color: "white",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.2s",
  },
  mapContainerStyle: {
    width: "100%",
    height: "350px",
    borderRadius: "16px",
    overflow: "hidden",
    position: "relative",
    border: "1px solid rgba(255,255,255,0.1)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
  },
  mapOverlayHint: {
    position: "absolute",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(15, 23, 42, 0.9)",
    color: "white",
    padding: "8px 16px",
    borderRadius: "20px",
    fontSize: "14px",
    fontWeight: "bold",
    zIndex: 1000,
    pointerEvents: "none",
    border: "1px solid rgba(255,255,255,0.2)",
    backdropFilter: "blur(4px)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
  }
};

export default UploadPage;
