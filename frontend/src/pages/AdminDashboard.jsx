import React, { useEffect, useState } from 'react';
import { useNotification } from '../NotificationContext';
import axios from 'axios';
import { X, MapPin, AlertTriangle, Image as ImageIcon, CheckCircle, Clock, MessageSquare, Search, Filter, Users } from 'lucide-react';

const API_URL = 'http://127.0.0.1:8000';

// ---- Helpers ----
const statusConfig = {
  'Open':               { bg: 'rgba(239,68,68,0.12)',    text: '#f87171', border: 'rgba(239,68,68,0.3)',   dot: '#ef4444' },
  'In Progress':        { bg: 'rgba(59,130,246,0.12)',   text: '#60a5fa', border: 'rgba(59,130,246,0.3)',  dot: '#3b82f6' },
  'Resolved':           { bg: 'rgba(34,197,94,0.12)',    text: '#4ade80', border: 'rgba(34,197,94,0.3)',   dot: '#22c55e' },
  'Escalated':          { bg: 'rgba(239,68,68,0.12)',    text: '#fca5a5', border: 'rgba(239,68,68,0.3)',   dot: '#ef4444' },
  'AwaitingUserInput':  { bg: 'rgba(245,158,11,0.12)',   text: '#fbbf24', border: 'rgba(245,158,11,0.3)',  dot: '#f59e0b' },
};

const getStatus = (s) => statusConfig[s] || { bg: 'rgba(148,163,184,0.1)', text: '#94a3b8', border: 'rgba(148,163,184,0.2)', dot: '#94a3b8' };

const verifBadge = {
  'Passed':               { label: '✅ AI Passed',               color: '#4ade80', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.3)'   },
  'AwaitingUserInput':    { label: '⏳ Awaiting User',            color: '#fbbf24', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  'UserConfirmedResolved':{ label: '✅ User Confirmed',           color: '#4ade80', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.3)'   },
  'UserEscalated':        { label: '🚨 User Escalated',           color: '#f87171', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)'   },
  'Failed':               { label: '❌ AI Failed',                color: '#f87171', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)'   },
};

const STATUS_FILTERS = ['All', 'Open', 'In Progress', 'Resolved', 'Escalated', 'AwaitingUserInput'];
const SEVERITY_FILTERS = ['All', 'High', 'Medium', 'Low'];

function StatusBadge({ status, size = 'sm' }) {
  const cfg = getStatus(status);
  const pad = size === 'lg' ? '6px 16px' : '4px 12px';
  const fs = size === 'lg' ? '0.85rem' : '0.75rem';
  return (
    <span style={{
      background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}`,
      padding: pad, borderRadius: '99px', fontSize: fs, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.5px', display: 'inline-flex', alignItems: 'center', gap: '6px'
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
      {status}
    </span>
  );
}

function AdminDashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [adminFeedback, setAdminFeedback] = useState('');
  const [resolutionImage, setResolutionImage] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const [filterStatus, setFilterStatus] = useState('All');
  const [filterSeverity, setFilterSeverity] = useState('All');
  const [showEscalated, setShowEscalated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { notify } = useNotification();

  const fetchTickets = async () => {
    try {
      const params = { status: filterStatus, severity: filterSeverity, search: searchQuery };
      if (showEscalated) params.is_escalated = 1;
      const response = await axios.get(`${API_URL}/tickets/`, { params });
      setTickets(response.data);
    } catch (err) {
      console.error(err);
      notify('Failed to load tickets', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch with debounce
    const t = setTimeout(() => fetchTickets(), 300);
    
    // Polling interval every 5 seconds
    const intervalId = setInterval(() => {
      fetchTickets();
    }, 5000);
    
    return () => {
      clearTimeout(t);
      clearInterval(intervalId);
    };
  }, [filterStatus, filterSeverity, showEscalated, searchQuery]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) return;
    try {
      await axios.delete(`${API_URL}/tickets/${id}`);
      fetchTickets();
      if (selectedTicket?.id === id) setSelectedTicket(null);
      notify('Ticket deleted successfully', 'success');
    } catch (err) {
      notify('Failed to delete ticket', 'error');
    }
  };

  const handleVerifyResolution = async () => {
    if (!resolutionImage) { notify('Please select an image to verify the repair.', 'error'); return; }
    setVerifying(true);
    const formData = new FormData();
    formData.append('file', resolutionImage);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/tickets/${selectedTicket.id}/verify_resolution/`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );
      notify(res.data.message, res.data.success ? 'success' : 'info');
      fetchTickets();
      setSelectedTicket(res.data.ticket);
      setResolutionImage(null);
    } catch (err) {
      notify(err.response?.data?.detail || 'Verification failed.', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleStatusUpdate = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Open' ? 'Resolved' : 'Open';
    try {
      await axios.put(`${API_URL}/tickets/${id}`, { status: newStatus, admin_feedback: adminFeedback || null });
      fetchTickets();
      if (selectedTicket?.id === id) setSelectedTicket({ ...selectedTicket, status: newStatus, admin_feedback: adminFeedback });
      notify(`Ticket marked as ${newStatus}`, 'success');
    } catch (err) {
      notify('Failed to update status', 'error');
    }
  };

  const openModal = async (ticket) => {
    setSelectedTicket(ticket);
    setAdminFeedback(ticket.admin_feedback || '');
    setResolutionImage(null);
    // Auto-mark Open → In Progress
    if (ticket.status === 'Open') {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.post(
          `${API_URL}/tickets/${ticket.id}/mark_opened`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSelectedTicket({ ...ticket, status: 'In Progress' });
        fetchTickets();
      } catch (err) {
        console.error('Failed to mark opened:', err);
      }
    }
  };

  const closeModal = () => { setSelectedTicket(null); setAdminFeedback(''); setResolutionImage(null); };

  const stats = {
    open: tickets.filter(t => t.status === 'Open').length,
    inProgress: tickets.filter(t => t.status === 'In Progress').length,
    resolved: tickets.filter(t => t.status === 'Resolved').length,
    escalated: tickets.filter(t => t.is_escalated).length,
    awaiting: tickets.filter(t => t.verification_status === 'AwaitingUserInput').length,
  };

  return (
    <div>
      {/* ---- Header ---- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h2 className="text-gradient" style={{ fontSize: '2.5rem', margin: 0, fontWeight: 800 }}>Command Center</h2>
          <p style={{ color: 'var(--text-muted)', margin: '5px 0 0 0' }}>Manage and oversee road infrastructure reports</p>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[
            { label: 'Open', val: stats.open, clr: '#f87171', border: 'rgba(239,68,68,0.2)' },
            { label: 'In Progress', val: stats.inProgress, clr: '#60a5fa', border: 'rgba(59,130,246,0.2)' },
            { label: 'Resolved', val: stats.resolved, clr: '#4ade80', border: 'rgba(34,197,94,0.2)' },
            { label: 'Escalated', val: stats.escalated, clr: '#fca5a5', border: 'rgba(239,68,68,0.2)' },
          ].map(s => (
            <div key={s.label} className="glass-panel" style={{ padding: '10px 20px', borderRadius: '16px', border: `1px solid ${s.border}`, textAlign: 'center', minWidth: '80px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>{s.label}</div>
              <div style={{ color: s.clr, fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}>{s.val}</div>
            </div>
          ))}
          {stats.awaiting > 0 && (
            <div className="glass-panel pulse" style={{ padding: '10px 20px', borderRadius: '16px', border: '1px solid rgba(245,158,11,0.35)', textAlign: 'center', minWidth: '80px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Awaiting</div>
              <div style={{ color: '#fbbf24', fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}>{stats.awaiting}</div>
            </div>
          )}
        </div>
      </div>

      {/* ---- Filter Bar ---- */}
      <div className="glass-panel" style={{ padding: '20px 24px', borderRadius: '24px', marginBottom: '28px' }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search by ID, location, damage type..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input"
            style={{ margin: 0, padding: '11px 16px 11px 40px', borderRadius: '14px', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        {/* Status Pills */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', marginBottom: '8px' }}>Status</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {STATUS_FILTERS.map(s => {
              const active = filterStatus === s;
              const cfg = s === 'All' ? null : getStatus(s);
              return (
                <button key={s} onClick={() => setFilterStatus(s)} style={{
                  padding: '6px 16px', borderRadius: '99px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                  background: active ? (cfg ? cfg.bg : 'rgba(99,102,241,0.15)') : 'rgba(255,255,255,0.04)',
                  color: active ? (cfg ? cfg.text : '#818cf8') : 'var(--text-dim)',
                  border: active ? `1.5px solid ${cfg ? cfg.border : 'rgba(99,102,241,0.4)'}` : '1.5px solid rgba(255,255,255,0.07)',
                }}>
                  {s === 'AwaitingUserInput' ? 'Awaiting User' : s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Severity Pills + Escalated Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', marginBottom: '8px' }}>Severity</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {SEVERITY_FILTERS.map(s => {
                const active = filterSeverity === s;
                const sevClr = s === 'High' ? '#ef4444' : s === 'Medium' ? '#f59e0b' : s === 'Low' ? '#22c55e' : undefined;
                return (
                  <button key={s} onClick={() => setFilterSeverity(s)} style={{
                    padding: '6px 16px', borderRadius: '99px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                    background: active ? (sevClr ? `${sevClr}18` : 'rgba(99,102,241,0.15)') : 'rgba(255,255,255,0.04)',
                    color: active ? (sevClr || '#818cf8') : 'var(--text-dim)',
                    border: active ? `1.5px solid ${sevClr ? sevClr + '50' : 'rgba(99,102,241,0.4)'}` : '1.5px solid rgba(255,255,255,0.07)',
                  }}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <button onClick={() => setShowEscalated(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', borderRadius: '99px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.2s',
            background: showEscalated ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)',
            color: showEscalated ? '#fca5a5' : 'var(--text-dim)',
            border: showEscalated ? '1.5px solid rgba(239,68,68,0.35)' : '1.5px solid rgba(255,255,255,0.07)',
          }}>
            <AlertTriangle size={15} /> Escalated Only
          </button>
        </div>
      </div>

      {/* ---- Ticket List ---- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Table Header */}
        {!loading && tickets.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '60px 36px 1fr 180px 160px 110px', alignItems: 'center', padding: '8px 32px', color: 'var(--text-dim)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
            <span>#ID</span>
            <span></span>
            <span>Damage / Date · Reported by</span>
            <span>Severity</span>
            <span>Location</span>
            <span style={{ textAlign: 'right' }}>Status</span>
          </div>
        )}

        {loading ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '100px' }}>
            <div className="ai-spinner"></div>
            <p style={{ marginTop: '20px', color: 'var(--text-muted)' }}>Synchronizing infrastructure data...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '100px' }}>
            <Clock size={48} color="var(--text-muted)" />
            <h3 style={{ marginTop: '20px' }}>All clear!</h3>
            <p style={{ color: 'var(--text-muted)' }}>No reports match your filters.</p>
          </div>
        ) : (
          tickets.map(ticket => (
            <div
              key={ticket.id}
              onClick={() => openModal(ticket)}
              className="glass-panel hover-glow"
              style={{
                display: 'grid',
                gridTemplateColumns: '60px 36px 1fr 180px 160px 110px',
                alignItems: 'center',
                padding: '14px 32px',
                cursor: 'pointer',
                transition: 'var(--transition)',
                borderLeft: ticket.is_escalated ? '3px solid #ef4444' : '3px solid transparent',
                borderRadius: '18px',
              }}
            >
              <div style={{ fontWeight: 800, color: 'var(--text-dim)', fontSize: '1rem' }}>#{ticket.id}</div>

              <div>
                {ticket.is_escalated === 1 && (
                  <div className="pulse" title="Escalated">
                    <AlertTriangle size={18} color="#ef4444" />
                  </div>
                )}
                {ticket.verification_status === 'AwaitingUserInput' && !ticket.is_escalated && (
                  <span title="Awaiting User Verification" style={{ fontSize: '16px' }}>⏳</span>
                )}
              </div>

              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>{ticket.damage_type.replace('_', ' ')}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  {new Date(ticket.created_at + 'Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  {ticket.user?.name && <span style={{ marginLeft: '8px', color: 'var(--text-muted)', fontWeight: 600 }}>· {ticket.user.name}</span>}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`badge badge-${ticket.severity}`} style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '0.78rem' }}>{ticket.severity}</span>
                <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(ticket.confidence * 100)}%`, background: 'var(--primary)' }}></div>
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <MapPin size={13} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }}>{ticket.location || 'N/A'}</span>
              </div>

              <div style={{ textAlign: 'right' }}>
                <StatusBadge status={ticket.status} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* ---- MODAL ---- */}
      {selectedTicket && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,15,30,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'rgba(20,30,48,0.97)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', width: '100%', maxWidth: '920px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '24px', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column' }}>

            {/* Modal Header */}
            <div style={{ padding: '22px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'rgba(10,15,28,0.95)', backdropFilter: 'blur(10px)', zIndex: 10, borderRadius: '24px 24px 0 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#f8fafc', fontWeight: 800 }}>Ticket #{selectedTicket.id}</h3>
                <StatusBadge status={selectedTicket.status} size="lg" />
                {selectedTicket.is_escalated === 1 && (
                  <span style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '4px 12px', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 700 }}>
                    🔺 ESCALATED
                  </span>
                )}
              </div>
              <button onClick={closeModal} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: '#94a3b8', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }} onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; }}>
                <X size={22} />
              </button>
            </div>

            {/* Awaiting User Input Banner */}
            {selectedTicket.verification_status === 'AwaitingUserInput' && (
              <div style={{ margin: '20px 32px 0', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '14px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '28px' }}>⏳</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: '0.95rem' }}>Awaiting User Verification</div>
                  <div style={{ color: '#92400e', fontSize: '0.85rem', marginTop: '2px', color: 'rgba(251,191,36,0.6)' }}>A verification email with Yes/No buttons has been sent to the user. Ticket will auto-resolve or escalate based on their response.</div>
                </div>
              </div>
            )}

            {/* Modal Body */}
            <div style={{ padding: '28px 32px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: '28px' }}>

              {/* Left: Image(s) & Comment */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Before (Original Report)</div>
                  <div style={{ background: 'rgba(10,15,28,0.6)', borderRadius: '14px', padding: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <img src={`${API_URL}${selectedTicket.image_path}`} alt="Original Damage" style={{ width: '100%', height: 'auto', borderRadius: '10px', display: 'block', maxHeight: '260px', objectFit: 'cover' }} />
                  </div>
                </div>

                {selectedTicket.resolution_image_path && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>After (Repair Attempt)</div>
                    <div style={{ background: 'rgba(10,15,28,0.6)', borderRadius: '14px', padding: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <img src={`${API_URL}${selectedTicket.resolution_image_path}`} alt="After Repair" style={{ width: '100%', height: 'auto', borderRadius: '10px', display: 'block', maxHeight: '260px', objectFit: 'cover' }} />
                    </div>
                  </div>
                )}

                {selectedTicket.user_comment && (
                  <div style={{ background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.2)', borderRadius: '14px', padding: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#5eead4', fontWeight: 600, marginBottom: '10px' }}>
                      <MessageSquare size={16} /> User Comment
                    </div>
                    <p style={{ margin: 0, color: '#ccfbf1', lineHeight: '1.6', fontSize: '0.95rem' }}>"{selectedTicket.user_comment}"</p>
                  </div>
                )}
              </div>

              {/* Right: Info + Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Info */}
                <div style={{ background: 'rgba(10,15,28,0.5)', borderRadius: '16px', padding: '22px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    { label: 'Damage Classification', value: selectedTicket.damage_type.replace('_', ' ') },
                    { label: 'Date Submitted', value: new Date(selectedTicket.created_at + 'Z').toLocaleString() },
                  ].map(row => (
                    <div key={row.label}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>{row.label}</div>
                      <div style={{ fontSize: '1rem', color: '#f8fafc' }}>{row.value}</div>
                    </div>
                  ))}

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Severity</div>
                    <span className={`badge badge-${selectedTicket.severity}`} style={{ fontSize: '0.88rem', padding: '5px 12px' }}>{selectedTicket.severity}</span>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>AI Confidence</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ height: '6px', flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', width: `${(selectedTicket.confidence * 100).toFixed(0)}%` }}></div>
                      </div>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#818cf8' }}>{(selectedTicket.confidence * 100).toFixed(1)}%</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>GPS Location</div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <MapPin size={15} color="#fca5a5" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ fontSize: '0.9rem', color: '#e2e8f0', lineHeight: '1.4' }}>{selectedTicket.location}</span>
                    </div>
                  </div>

                  {/* Reported By */}
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={13} /> Reported By
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div style={{ fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>{selectedTicket.user?.name || 'Unknown User'}</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '2px' }}>📧 {selectedTicket.user?.email || 'N/A'}</div>
                      {selectedTicket.user?.phone && <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>📱 {selectedTicket.user.phone}</div>}
                    </div>
                  </div>

                  {/* Verification Status Badge */}
                  {selectedTicket.verification_status && selectedTicket.verification_status !== 'Pending' && (() => {
                    const vb = verifBadge[selectedTicket.verification_status];
                    return vb ? (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>AI Verification</div>
                        <div style={{ background: vb.bg, border: `1px solid ${vb.border}`, padding: '10px 14px', borderRadius: '10px', color: vb.color, fontWeight: 600, fontSize: '0.9rem' }}>
                          {vb.label}
                          {selectedTicket.resolution_image_path && (
                            <a href={`${API_URL}${selectedTicket.resolution_image_path}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: '6px', color: '#94a3b8', fontSize: '0.82rem', textDecoration: 'underline' }}>View After Image ↗</a>
                          )}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Actions */}
                <div style={{ background: 'rgba(10,15,28,0.4)', borderRadius: '16px', padding: '22px', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#818cf8', fontWeight: 700 }}>Resolution Hub</h4>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Admin Notes</label>
                    <textarea
                      value={adminFeedback}
                      onChange={e => setAdminFeedback(e.target.value)}
                      placeholder="Internal notes or status updates for the user..."
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(10,15,28,0.6)', color: '#f8fafc', fontSize: '0.9rem', fontFamily: 'inherit', minHeight: '90px', resize: 'vertical', display: 'block', boxSizing: 'border-box' }}
                    />
                  </div>

                  {(selectedTicket.status === 'Open' || selectedTicket.status === 'In Progress') ? (
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.12)' }}>
                      <h5 style={{ margin: '0 0 12px 0', fontSize: '0.88rem', color: '#cbd5e1', fontWeight: 600 }}>Upload After-Repair Image for AI Verification</h5>
                      <label style={{ display: 'block', marginBottom: '12px', cursor: 'pointer' }}>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '10px', textAlign: 'center', border: `1px dashed ${resolutionImage ? '#6366f1' : 'rgba(255,255,255,0.1)'}`, transition: 'all 0.2s' }}>
                          <ImageIcon size={20} color={resolutionImage ? '#818cf8' : '#94a3b8'} style={{ marginBottom: '4px' }} />
                          <div style={{ fontSize: '0.82rem', color: resolutionImage ? '#818cf8' : '#94a3b8', fontWeight: 600 }}>
                            {resolutionImage ? `✓ ${resolutionImage.name}` : 'Click to upload proof of repair'}
                          </div>
                        </div>
                        <input type="file" accept="image/*" onChange={e => setResolutionImage(e.target.files[0])} style={{ display: 'none' }} />
                      </label>
                      <button
                        onClick={handleVerifyResolution}
                        disabled={!resolutionImage || verifying}
                        style={{
                          width: '100%', background: (!resolutionImage || verifying) ? 'rgba(10,15,28,0.8)' : 'linear-gradient(135deg,#10b981,#059669)',
                          color: (!resolutionImage || verifying) ? '#64748b' : 'white',
                          border: (!resolutionImage || verifying) ? '1px solid rgba(255,255,255,0.05)' : 'none',
                          padding: '12px', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem',
                          cursor: (!resolutionImage || verifying) ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
                        }}
                      >
                        <CheckCircle size={16} />
                        {verifying ? 'AI Analysing Image...' : 'Run AI Verification'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStatusUpdate(selectedTicket.id, selectedTicket.status)}
                      style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: 'white', border: 'none', padding: '13px', borderRadius: '12px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                    >
                      <Clock size={16} /> Reopen Ticket (Override)
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(selectedTicket.id)}
                    style={{ background: 'rgba(239,68,68,0.05)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)', padding: '10px', borderRadius: '12px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.05)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
                  >
                    Delete Ticket Forever
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
