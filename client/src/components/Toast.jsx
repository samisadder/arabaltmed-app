import React, { useEffect, useState } from 'react';

const VARIANTS = {
  success: { bg: '#f0fdf4', border: '#86efac', color: '#15803d', icon: '✓' },
  error:   { bg: '#fef2f2', border: '#fca5a5', color: '#dc2626', icon: '✕' },
  info:    { bg: '#eff6ff', border: '#93c5fd', color: '#2563eb', icon: 'ℹ' },
};

export default function Toast({ message, variant = 'success', onDismiss, duration = 4000 }) {
  const [visible, setVisible] = useState(true);
  const v = VARIANTS[variant] || VARIANTS.success;

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss && onDismiss(), 300);
    }, duration);
    return () => clearTimeout(t);
  }, [message, duration, onDismiss]);

  if (!message) return null;

  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 10,
      background: v.bg, border: `1.5px solid ${v.border}`,
      color: v.color, borderRadius: 10,
      padding: '12px 18px', fontSize: 14, fontWeight: 600,
      boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
      maxWidth: 380,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(-8px)',
      transition: 'opacity 0.25s, transform 0.25s',
    }}>
      <span style={{ fontSize: 16, fontWeight: 700 }}>{v.icon}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onDismiss && onDismiss(), 300); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: v.color, fontSize: 16, padding: '0 0 0 6px', lineHeight: 1 }}
      >×</button>
    </div>
  );
}
