'use client';
// ============================================================
// PayGuard — Theme Toggle (Dark / Light)
// ============================================================
import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('payguard-theme');
    if (saved === 'light') {
      setIsDark(false);
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  const toggle = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('payguard-theme', newTheme);
  };

  return (
    <button
      onClick={toggle}
      aria-label="Basculer thème"
      title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        fontSize: '1.2rem', padding: '0.3rem', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        transition: 'transform 0.3s ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
