import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export function useNotification() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const notify = useCallback((message, type = 'info', timeout = 4000) => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter(n => n.id !== id));
    }, timeout);
  }, []);

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999 }}>
        {notifications.map(n => (
          <div key={n.id} style={{
            background: n.type === 'error' ? '#EF4444' : n.type === 'success' ? '#10B981' : '#4F46E5',
            color: 'white',
            borderRadius: 12,
            padding: '1rem 1.5rem',
            marginBottom: 12,
            minWidth: 220,
            boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
            fontWeight: 600,
            fontSize: '1.1rem',
            opacity: 0.97
          }}>
            {n.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}
