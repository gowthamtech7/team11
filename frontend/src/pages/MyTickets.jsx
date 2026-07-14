import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNotification } from '../NotificationContext';
import { RefreshCcw, Ticket as TicketIcon, Calendar, CheckSquare, AlertTriangle, MapPin } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const statusConfig = {
  'open':               { bg: 'rgba(239,68,68,0.14)',   text: '#f87171', border: 'rgba(239,68,68,0.3)'   },
  'pending':            { bg: 'rgba(239,68,68,0.14)',   text: '#f87171', border: 'rgba(239,68,68,0.3)'   },
  'in progress':        { bg: 'rgba(59,130,246,0.14)',  text: '#60a5fa', border: 'rgba(59,130,246,0.3)'  },
  'resolved':           { bg: 'rgba(34,197,94,0.14)',   text: '#4ade80', border: 'rgba(34,197,94,0.3)'   },
  'closed':             { bg: 'rgba(34,197,94,0.14)',   text: '#4ade80', border: 'rgba(34,197,94,0.3)'   },
  'escalated':          { bg: 'rgba(239,68,68,0.14)',   text: '#fca5a5', border: 'rgba(239,68,68,0.3)'   },
  'awaitinguserinput':  { bg: 'rgba(245,158,11,0.14)',  text: '#fbbf24', border: 'rgba(245,158,11,0.3)'  },
};

const getStatusCfg = (s) => statusConfig[(s || '').toLowerCase().replace(/\s/g, '')] || { bg: 'rgba(148,163,184,0.1)', text: '#94a3b8', border: 'rgba(148,163,184,0.2)' };
const getSeverityColor = (s) => s === 'High' ? '#ef4444' : s === 'Medium' ? '#f59e0b' : '#10b981';

export default function MyTickets({ user }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);
  const { notify } = useNotification();

  const fetchTickets = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get(`${API_URL}/my-tickets`, { headers: { Authorization: `Bearer ${token}` } });
      if (Array.isArray(res.data)) {
        setTickets(res.data.sort((a, b) => new Date(b.created_at + 'Z') - new Date(a.created_at + 'Z')));
      } else {
        setTickets([]);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        if (notify) notify('Session expired. Please log in again.', 'error');
        localStorage.removeItem('token');
        window.location.href = '/';
      } else {
        if (notify) notify('Failed to load tickets', 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [notify]);

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(() => fetchTickets(true), 10000);
    return () => clearInterval(interval);
  }, [fetchTickets]);

  const handleUserVerification = async (ticketId, resolved) => {
    // This is a shortcut for users who want to respond directly from the app
    // The main flow is via email link, but we also support in-app click
    const label = resolved ? 'Yes, it\'s resolved' : 'No, still broken';
    if (!window.confirm(`Confirm: ${label}?`)) return;
    setVerifyingId(ticketId);
    try {
      const ticket = tickets.find(t => t.id === ticketId);
      // We don't have the token in the client (it's email-based), so we call a simplified endpoint
      const res = await axios.post(`${API_URL}/tickets/${ticketId}/user_verify_app`, { resolved }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      notify(resolved ? '✅ Ticket marked resolved. Thank you!' : '🚨 Issue escalated to higher authority.', resolved ? 'success' : 'error');
      fetchTickets(true);
    } catch (err) {
      notify(err.response?.data?.detail || 'Action failed.', 'error');
    } finally {
      setVerifyingId(null);
    }
  };

  if (loading) return (
    <div style={styles.loadingContainer}>
      <div className="spin" style={styles.spinner} />
      <p style={styles.loadingText}>Loading your tickets...</p>
      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleInfo}>
          <div className="glass-panel hover-glow" style={{ padding: '12px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)', boxShadow: 'var(--shadow-lg)' }}>
            <TicketIcon size={32} color="white" />
          </div>
          <h2 className="text-gradient" style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0 }}>My Tickets</h2>
          <div className="badge">{tickets.length} Report{tickets.length !== 1 ? 's' : ''}</div>
        </div>
        <button onClick={() => fetchTickets(true)} className="btn btn-secondary shadow-glow">
          <RefreshCcw size={18} className={refreshing ? 'spin' : ''} style={{ marginRight: '8px' }} />
          {refreshing ? 'Syncing...' : 'Refresh'}
        </button>
      </div>

      {tickets.length === 0 ? (
        <div style={styles.emptyState}>
          <AlertTriangle size={48} color="#94a3b8" style={{ marginBottom: '16px' }} />
          <h3 style={styles.emptyTitle}>No tickets found</h3>
          <p style={styles.emptyText}>You haven't submitted any road damage reports yet.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {tickets.map(ticket => {
            const statusCfg = getStatusCfg(ticket.status);
            const isAwaiting = ticket.verification_status === 'AwaitingUserInput';
            const isEscalated = ticket.is_escalated === 1;
            return (
              <div key={ticket.id} className="glass-panel hover-glow" style={{ borderRadius: '28px', overflow: 'hidden', height: 'fit-content' }}>
                {/* Card Header */}
                <div style={{ ...styles.cardHeader, background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={styles.ticketId}>ID: {ticket.id}</span>
                    {isEscalated && (
                      <span style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '3px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        🔺 Escalated
                      </span>
                    )}
                  </div>
                  <span style={{ ...styles.statusBadge, backgroundColor: statusCfg.bg, color: statusCfg.text, borderColor: statusCfg.border }}>
                    {ticket.status}
                  </span>
                </div>

                {/* Awaiting User Input Banner */}
                {isAwaiting && (
                  <div style={{ background: 'rgba(245,158,11,0.1)', borderBottom: '1px solid rgba(245,158,11,0.2)', padding: '14px 24px' }}>
                    <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: '0.9rem', marginBottom: '6px' }}>
                      ⏳ Please verify if the repair is complete
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'rgba(251,191,36,0.65)', marginBottom: '12px' }}>
                      Our AI could not confirm the fix. Was the issue resolved at your location?
                    </div>

                    {/* Before / After images side-by-side */}
                    {ticket.resolution_image_path && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(251,191,36,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Before</div>
                          <img src={`${API_URL}${ticket.image_path}`} alt="Before" style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(251,191,36,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>After</div>
                          <img src={`${API_URL}${ticket.resolution_image_path}`} alt="After" style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }} />
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        onClick={() => handleUserVerification(ticket.id, true)}
                        disabled={verifyingId === ticket.id}
                        style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', color: 'white', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}
                      >
                        {verifyingId === ticket.id ? '...' : '✅ Yes, Fixed!'}
                      </button>
                      <button
                        onClick={() => handleUserVerification(ticket.id, false)}
                        disabled={verifyingId === ticket.id}
                        style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: 'white', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}
                      >
                        {verifyingId === ticket.id ? '...' : '❌ No, Still Broken'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Image */}
                <div style={styles.imageContainer}>
                  <a href={`${API_URL}${ticket.image_path}`} target="_blank" rel="noopener noreferrer">
                    <img src={`${API_URL}${ticket.image_path}`} alt="Damage" style={styles.image} />
                    <div style={styles.imageOverlay}>Inspect Image</div>
                  </a>
                </div>

                {/* Body */}
                <div style={styles.cardBody}>
                  <h3 style={{ ...styles.damageType, fontSize: '1.4rem' }}>{ticket.damage_type || 'Unknown Damage'}</h3>

                  <div style={styles.detailsList}>
                    <div style={styles.detailRow}>
                      <AlertTriangle size={16} color={getSeverityColor(ticket.severity)} />
                      <span style={styles.detailText}>Priority: <strong style={{ color: getSeverityColor(ticket.severity) }}>{ticket.severity}</strong></span>
                    </div>
                    <div style={styles.detailRow}>
                      <CheckSquare size={16} color="var(--primary)" />
                      <span style={styles.detailText}>Confidence: <strong>{(ticket.confidence * 100).toFixed(1)}%</strong></span>
                    </div>
                    {ticket.location && ticket.location !== 'Unknown' && (
                      <div style={styles.detailRow}>
                        <MapPin size={16} color="var(--text-dim)" />
                        <span style={{ ...styles.detailText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>{ticket.location}</span>
                      </div>
                    )}
                    <div style={styles.detailRow}>
                      <Calendar size={16} color="var(--text-dim)" />
                      <span style={styles.detailText}>{new Date(ticket.created_at + 'Z').toLocaleDateString()}</span>
                    </div>
                  </div>

                  {ticket.admin_feedback && (
                    <div style={{ ...styles.feedbackBox, background: 'rgba(129,140,248,0.08)', borderLeftColor: 'var(--primary)', marginTop: '20px' }}>
                      <span style={{ ...styles.feedbackLabel, color: 'var(--primary)', marginBottom: '8px' }}>Official Feedback</span>
                      <p style={{ ...styles.feedbackText, fontSize: '0.93rem', opacity: 0.9 }}>{ticket.admin_feedback}</p>
                    </div>
                  )}

                  {/* Verification status pill */}
                  {ticket.verification_status && ticket.verification_status !== 'Pending' && !isAwaiting && (
                    <div style={{ marginTop: '14px' }}>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: '99px',
                        background: ticket.verification_status === 'UserConfirmedResolved' || ticket.verification_status === 'Passed'
                          ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                        color: ticket.verification_status === 'UserConfirmedResolved' || ticket.verification_status === 'Passed'
                          ? '#4ade80' : '#f87171',
                        border: '1px solid transparent',
                      }}>
                        {ticket.verification_status === 'Passed' ? '✅ AI Verified' :
                         ticket.verification_status === 'UserConfirmedResolved' ? '✅ You Confirmed' :
                         ticket.verification_status === 'UserEscalated' ? '🚨 Escalated by You' :
                         ticket.verification_status}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const styles = {
  container: { maxWidth: '1400px', margin: '0 auto', padding: '60px 40px', animation: 'fadeIn 0.8s cubic-bezier(0.16,1,0.3,1)' },
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' },
  spinner: { width: '50px', height: '50px', border: '3px solid rgba(255,255,255,0.05)', borderTopColor: 'var(--primary)', borderRadius: '50%', marginBottom: '20px', boxShadow: '0 0 20px rgba(129,140,248,0.2)' },
  loadingText: { color: 'var(--text-muted)', fontSize: '1.2rem', fontWeight: '600', letterSpacing: '-0.02em' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '60px', flexWrap: 'wrap', gap: '30px' },
  titleInfo: { display: 'flex', alignItems: 'center', gap: '25px' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 40px', textAlign: 'center' },
  emptyTitle: { color: '#f8fafc', fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px' },
  emptyText: { color: 'var(--text-muted)', fontSize: '1rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(380px,1fr))', gap: '32px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  ticketId: { fontWeight: '800', color: 'var(--text-dim)', fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase' },
  statusBadge: { padding: '6px 14px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: '800', borderWidth: '1px', borderStyle: 'solid', textTransform: 'uppercase', letterSpacing: '0.5px' },
  imageContainer: { width: '100%', height: '220px', position: 'relative', background: '#0b0f1a', overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  image: { width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s cubic-bezier(0.16,1,0.3,1)' },
  imageOverlay: { position: 'absolute', inset: 0, background: 'rgba(11,15,26,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '1rem', letterSpacing: '1px', opacity: 0, transition: 'var(--transition)', textTransform: 'uppercase' },
  cardBody: { padding: '28px' },
  damageType: { fontSize: '1.75rem', fontWeight: '800', color: '#f8fafc', margin: '0 0 18px 0', letterSpacing: '-0.03em' },
  detailsList: { display: 'flex', flexDirection: 'column', gap: '14px' },
  detailRow: { display: 'flex', alignItems: 'center', gap: '12px' },
  detailText: { fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: '600' },
  feedbackBox: { padding: '20px', borderRadius: '16px', borderLeftWidth: '4px', borderLeftStyle: 'solid' },
  feedbackLabel: { fontSize: '0.72rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1.5px', display: 'block' },
  feedbackText: { margin: 0, color: 'var(--text-main)', lineHeight: '1.7' },
};
